package com.entregacontrole.pro;

import android.app.PendingIntent;
import android.app.WalletApis;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Real, native Android AppWidgetProvider for EntregaControle Pro.
 * Provides a 4x2 home screen widget showing:
 * - Current Delivery Target / Adjusted Goal
 * - Today's Acquired Earnings (Ifood + Quita)
 * - Traveled Distance (KM)
 * - Workhours / Active Ride duration
 * - Progress bar that changes color: orange when < goal, green when >= goal.
 * - Handles day-off status indicator ("DIA DE FOLGA ✅")
 * - Launches EntregaControle Pro app on click.
 */
public class EntregaControleWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "EntregaControleProPrefs";
    private static final String KEY_WIDGET_DATA = "widget_state_data";
    private static final DecimalFormat currencyFormat = new DecimalFormat("R$ #,##0.00");
    private static final DecimalFormat kmFormat = new DecimalFormat("#,##0.0 km");

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Perform standard loop over each active widget deployed on the Android Home Screen
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // Listening for manual sync transmits triggered inside the app
        if ("com.entregacontrole.pro.ACTION_WIDGET_UPDATE".equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, EntregaControleWidgetProvider.class));
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // 1. Initial RemoteViews using our native 4x2 layout resource
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_delivery_tracker_4x2);

        // 2. Click interaction: Clicking ANY region on the widget launches the core native application
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage("com.entregacontrole.pro");
        if (launchIntent == null) {
            launchIntent = new Intent(context, MainActivity.class);
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            launchIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container_root, pendingIntent);

        // 3. Extract actual values directly from Shared Preferences storage filled by the app's script bridge
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        boolean isOffToday = prefs.getBoolean("today_is_off", false);
        double todayGanhos = prefs.getFloat("today_earnings", 0f);
        double todayTarget = prefs.getFloat("today_target", 0f);
        double todayKm = prefs.getFloat("today_km", 0f);
        String todayTime = prefs.getString("today_time", "00h00min");
        
        // Customizations configured under Settings
        boolean showMeta = prefs.getBoolean("opt_showMeta", true);
        boolean showGanhos = prefs.getBoolean("opt_showGanhos", true);
        boolean showKm = prefs.getBoolean("opt_showKm", true);
        boolean showTempo = prefs.getBoolean("opt_showTempo", true);
        boolean showStatus = prefs.getBoolean("opt_showStatus", true);

        // Current Timestamp
        String lastUpdated = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
        views.setTextViewText(R.id.widget_text_sync_time, "Sinc: " + lastUpdated);

        // 4. Handle Day Off / Folga Status Mode
        if (isOffToday) {
            views.setViewVisibility(R.id.widget_layout_progress_group, View.GONE);
            views.setViewVisibility(R.id.widget_text_day_off_badge, View.VISIBLE);
            views.setTextViewText(R.id.widget_text_day_off_badge, "🌴 DIA DE FOLGA ✅");
            
            // Set values to null / empty or zero during day-off
            views.setTextViewText(R.id.widget_text_today_target, "Folga");
            views.setTextViewText(R.id.widget_text_today_earnings, "R$ 0,00");
        } else {
            views.setViewVisibility(R.id.widget_text_day_off_badge, View.GONE);
            views.setViewVisibility(R.id.widget_layout_progress_group, View.VISIBLE);

            // Populate calculations
            views.setTextViewText(R.id.widget_text_today_target, showMeta ? currencyFormat.format(todayTarget) : "---");
            views.setTextViewText(R.id.widget_text_today_earnings, showGanhos ? currencyFormat.format(todayGanhos) : "---");
        }

        // 5. Hydrate remaining dynamic stats parameters (KM and worked time)
        views.setTextViewText(R.id.widget_text_today_km, showKm ? kmFormat.format(todayKm) : "---");
        views.setTextViewText(R.id.widget_text_today_time, showTempo ? todayTime : "---");

        // 6. Calculate Progress Bar Fill and Color
        if (!isOffToday && todayTarget > 0) {
            int percentage = (int) Math.min(100, (todayGanhos / todayTarget) * 100);
            views.setProgressBar(R.id.widget_progress_bar_fill, 100, percentage, false);
            views.setTextViewText(R.id.widget_text_progress_percentage, percentage + "%");

            if (todayGanhos >= todayTarget) {
                // Goal achieved: Set progress bar color to Emerald Green
                views.setTextViewText(R.id.widget_text_meta_status_text, "META BATIDA! 🎉");
                views.setTextColor(R.id.widget_text_meta_status_text, Color.parseColor("#10B981")); // Emerald 500
                
                // Native android remoteViews tint implementation support for progress elements
                views.setInt(R.id.widget_progress_bar_fill, "setProgressTintCpu", Color.parseColor("#10B981"));
            } else {
                // Goal in progress: Set progress bar color to Orange
                double remaining = todayTarget - todayGanhos;
                views.setTextViewText(R.id.widget_text_meta_status_text, "Falta: " + currencyFormat.format(remaining));
                views.setTextColor(R.id.widget_text_meta_status_text, Color.parseColor("#64748B")); // Slate 500
                views.setInt(R.id.widget_progress_bar_fill, "setProgressTintCpu", Color.parseColor("#F97316")); // Orange 500
            }
        } else {
            views.setProgressBar(R.id.widget_progress_bar_fill, 100, 0, false);
            views.setTextViewText(R.id.widget_text_progress_percentage, "0%");
            views.setTextViewText(R.id.widget_text_meta_status_text, "Aguardando");
        }

        // Apply pilot status indicator badge
        if (showStatus) {
            views.setViewVisibility(R.id.widget_status_pilot_badge, View.VISIBLE);
            if (isOffToday) {
                views.setTextViewText(R.id.widget_status_pilot_badge, "DESCANSO");
                views.setInt(R.id.widget_status_pilot_badge, "setBackgroundResource", R.drawable.bg_badge_amber);
            } else if (todayGanhos > 0) {
                views.setTextViewText(R.id.widget_status_pilot_badge, "EM CORRIDA");
                views.setInt(R.id.widget_status_pilot_badge, "setBackgroundResource", R.drawable.bg_badge_orange);
            } else {
                views.setTextViewText(R.id.widget_status_pilot_badge, "ATIVO");
                views.setInt(R.id.widget_status_pilot_badge, "setBackgroundResource", R.drawable.bg_badge_emerald);
            }
        } else {
            views.setViewVisibility(R.id.widget_status_pilot_badge, View.GONE);
        }

        // Instruct the system widget manager to perform target redrawing
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
