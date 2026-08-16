package com.mybodyweight.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Deep-links to this app's own system settings page (Settings > Apps >
 * MyBodyWeight) so a user who denied a permission (e.g. location) can flip
 * it back on without hunting through the OS settings themselves.
 *
 * iOS doesn't need a native plugin for this — window.location.href =
 * "app-settings:" handles it directly. See src/lib/appSettings.ts, the
 * single call site both platforms go through.
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
