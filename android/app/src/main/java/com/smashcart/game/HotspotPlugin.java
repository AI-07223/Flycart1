package com.smashcart.game;

import android.Manifest;
import android.content.Context;
import android.net.wifi.SoftApConfiguration;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.lang.reflect.Method;

/**
 * Exposes Android's startLocalOnlyHotspot to the game UI.
 * Creates a local-only (no internet) Wi-Fi network that nearby devices join
 * for LAN play — the exact "free game wifi" flow, one tap, no settings hunt.
 */
@CapacitorPlugin(
    name = "Hotspot",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location")
    }
)
public class HotspotPlugin extends Plugin {

    private WifiManager.LocalOnlyHotspotReservation reservation;

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < 26) {
            call.reject("Local-only hotspot requires Android 8.0+");
            return;
        }
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationCallback");
            return;
        }
        startHotspot(call);
    }

    @PermissionCallback
    private void locationCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            startHotspot(call);
        } else {
            call.reject("Location permission denied — needed once to open a game network.");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        closeReservation();
        call.resolve();
    }

    /** Returns { active: boolean, ssid: string|null, passphrase: string|null }. */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("active", reservation != null);
        ret.put("ssid", ssid());
        ret.put("passphrase", passphrase());
        call.resolve(ret);
    }

    // ------------------------------------------------------------------

    private void startHotspot(PluginCall call) {
        if (reservation != null) {
            resolveStarted(call);
            return;
        }
        Context ctx = getContext().getApplicationContext();
        WifiManager wifi = (WifiManager) ctx.getSystemService(Context.WIFI_SERVICE);
        if (wifi == null) {
            call.reject("Wi-Fi service unavailable");
            return;
        }
        Handler handler = new Handler(Looper.getMainLooper());
        wifi.startLocalOnlyHotspot(new WifiManager.LocalOnlyHotspotCallback() {
            @Override
            public void onStarted(WifiManager.LocalOnlyHotspotReservation r) {
                reservation = r;
                resolveStarted(call);
            }

            @Override
            public void onFailed(int reason) {
                String msg;
                switch (reason) {
                    case 1: msg = "Tethering busy — disable your regular hotspot and retry"; break;
                    case 2: msg = "Wi-Fi is off — enable Wi-Fi and retry"; break;
                    case 3: msg = "Android refused (airplane mode or carrier restriction)"; break;
                    default: msg = "Hotspot failed (code " + reason + ")"; break;
                }
                call.reject(msg);
            }
        }, handler);
    }

    private void resolveStarted(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("active", true);
        ret.put("ssid", ssid());
        ret.put("passphrase", passphrase());
        call.resolve(ret);
    }

    /** SSID via public API on 33+, reflection on 26-32. Null when unreadable. */
    private String ssid() {
        if (reservation == null) return null;
        if (Build.VERSION.SDK_INT >= 33) {
            SoftApConfiguration cfg = reservation.getSoftApConfiguration();
            return cfg != null ? cfg.getSsid() : null;
        }
        WifiConfiguration cfg = legacyConfig();
        return cfg != null && cfg.SSID != null
            ? cfg.SSID.replace("\"", "")
            : null;
    }

    private String passphrase() {
        if (reservation == null) return null;
        if (Build.VERSION.SDK_INT >= 33) {
            SoftApConfiguration cfg = reservation.getSoftApConfiguration();
            return cfg != null ? cfg.getPassphrase() : null;
        }
        WifiConfiguration cfg = legacyConfig();
        return cfg != null ? cfg.preSharedKey : null;
    }

    /**
     * API 26-32: the reservation's WifiConfiguration is @hide — reflection is the
     * community-standard read path. ponytail: returns null gracefully when OEM
     * builds block it; UI then links to the system hotspot screen instead.
     */
    private WifiConfiguration legacyConfig() {
        try {
            Method m = reservation.getClass().getMethod("getWifiConfiguration");
            Object cfg = m.invoke(reservation);
            return cfg instanceof WifiConfiguration ? (WifiConfiguration) cfg : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void closeReservation() {
        if (reservation != null) {
            try { reservation.close(); } catch (Exception ignored) {}
            reservation = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        closeReservation();
        super.handleOnDestroy();
    }
}
