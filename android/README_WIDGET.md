# Manual de Integração e Compilação: Widget Nativo do Android (4x2)

Este diretório contém a estrutura nativa Android para habilitar o **Widget de Tela Inicial de tamanho 4x2** do dispositivo para o aplicativo **EntregaControle Pro**.

---

## 📁 Estrutura de Arquivos

- `src/com/entregacontrole/pro/AppWidgetProvider.java` — Provedor de widget de transmissão em tempo real.
- `res/xml/widget_info.xml` — Metadados de emparelhamento e dimensões na grade (4x2).
- `res/layout/widget_delivery_tracker_4x2.xml` — Layout XML visual para exibição compacta.
- `res/drawable/` — Formatos de preenchimento e bordas do tema escuro de alta legibilidade.
- `AndroidManifest.xml` — Registro do BroadcastReceiver de sistema necessário para a listagem automática de Widgets do Android.

---

## 📡 Sincronia de Dados (React Web ➔ Android Nativo SharedPreferences)

O widget nativo consome dados persistidos em `SharedPreferences` compartilhados sob o nome corporativo `EntregaControleProPrefs`. Para que a sua ponte do pacote APK (Capacitor, Cordova, Bubblewrap ou WebViews) atualize o widget a cada corrida adicionada ou botão de sincronização manual clicado, execute a seguinte injeção em JavaScript:

```javascript
/**
 * Pontes de escrita em SharedPreferences para Capacitor / Cordova
 */
function transmitirDadosParaWidget(dadosWidget) {
  // 1. Salva nos campos nativos de preferência
  const prefs = {
    today_is_off: dadosWidget.isOffToday,
    today_earnings: parseFloat(dadosWidget.ganhos),
    today_target: parseFloat(dadosWidget.meta),
    today_km: parseFloat(dadosWidget.km),
    today_time: dadosWidget.tempo,
    
    // Configurações de visibilidade
    opt_showMeta: dadosWidget.showMeta !== false,
    opt_showGanhos: dadosWidget.showGanhos !== false,
    opt_showKm: dadosWidget.showKm !== false,
    opt_showTempo: dadosWidget.showTempo !== false,
    opt_showStatus: dadosWidget.showStatus !== false
  };

  // 2. Persiste as chaves correspondentes e dispara um intent nativo broadcast:
  // Intent intent = new Intent("com.entregacontrole.pro.ACTION_WIDGET_UPDATE");
  // context.sendBroadcast(intent);
}
```

Deste modo, ao instalar o aplicativo atualizado em qualquer celular moderno, o widget aparecerá automaticamente no carrossel de widgets do sistema do usuário, permitindo o acompanhamento em tempo real das metas do motorista diretamente em seu papel de parede!
