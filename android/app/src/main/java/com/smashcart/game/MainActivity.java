package com.smashcart.game;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HotspotPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
