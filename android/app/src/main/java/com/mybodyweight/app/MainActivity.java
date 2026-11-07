package com.mybodyweight.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppSettingsPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        // An app, not a website: no native scrollbar line on the side.
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // Back button stays inside the app (close dialog / previous screen /
        // "End workout?"); window.__mbwBack (src/lib/androidBack.ts) returns
        // false only on Home, and then the app goes to the background.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                    "(function(){try{return window.__mbwBack ? window.__mbwBack() : false;}catch(e){return false;}})()",
                    result -> {
                        if (!"true".equals(result)) {
                            moveTaskToBack(true);
                        }
                    }
                );
            }
        });
    }
}
