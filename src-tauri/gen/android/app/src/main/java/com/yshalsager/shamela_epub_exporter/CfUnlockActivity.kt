package com.yshalsager.shamela_epub_exporter

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient

class CfUnlockActivity : Activity() {
  companion object {
    const val EXTRA_URL = "cf_unlock_url"
  }

  private val handler = Handler(Looper.getMainLooper())
  private var webView: WebView? = null

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    webView = WebView(this).apply {
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.loadWithOverviewMode = true
      settings.useWideViewPort = true
      settings.setSupportZoom(true)
      settings.builtInZoomControls = true
      settings.displayZoomControls = false
      CookieManager.getInstance().setAcceptCookie(true)
      webViewClient = object : WebViewClient() {}
      webChromeClient = object : WebChromeClient() {}
    }

    setContentView(webView)

    val url = intent.getStringExtra(EXTRA_URL) ?: "https://shamela.ws/"
    webView?.loadUrl(url)

    handler.postDelayed({ pollCfUnlock() }, 1000)
  }

  private fun pollCfUnlock() {
    webView?.evaluateJavascript(
      "(document.title || '').includes('moment') ? 'WAIT' : 'PASS'"
    ) { result ->
      if (result.contains("PASS")) {
        onCfUnlocked()
      } else {
        handler.postDelayed({ pollCfUnlock() }, 500)
      }
    }
  }

  private fun onCfUnlocked() {
    CookieManager.getInstance().flush()
    setResult(Activity.RESULT_OK)
    finish()
  }

  override fun onBackPressed() {
    setResult(Activity.RESULT_CANCELED)
    super.onBackPressed()
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    super.onDestroy()
  }

}
