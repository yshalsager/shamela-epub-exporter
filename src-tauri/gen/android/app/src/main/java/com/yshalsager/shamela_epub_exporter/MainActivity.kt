package com.yshalsager.shamela_epub_exporter

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import org.json.JSONObject


class MainActivity : TauriActivity() {
  private val handler = Handler(Looper.getMainLooper())
  private val androidBridge = AndroidBridge()
  private var mainWebView: Any? = null
  private var bridgeAttached = false
  private var cfFetchWebView: WebView? = null
  private var cfFetchReady = false
  private var cfUnlocked = false
  private var unlockInProgress = false
  private val pendingRequests = ArrayDeque<FetchRequest>()
  private val cfUnlockLauncher = registerForActivityResult(
    ActivityResultContracts.StartActivityForResult()
  ) { result ->
    unlockInProgress = false
    if (result.resultCode == Activity.RESULT_OK) {
      onCfUnlocked()
    } else {
      failPendingRequests("cf_unlock_cancelled")
    }
  }

  private data class FetchRequest(
    val requestId: String,
    val url: String,
    val optionsJson: String?
  )

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    handler.post { attachMainBridge(60) }

    val rootView = window.decorView
    val layoutListener = object : ViewTreeObserver.OnGlobalLayoutListener {
      override fun onGlobalLayout() {
        if (bridgeAttached) {
          rootView.viewTreeObserver.removeOnGlobalLayoutListener(this)
          return
        }
        attachMainBridge(5)
      }
    }
    rootView.viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
  }

  override fun onResume() {
    super.onResume()
    if (!bridgeAttached) {
      handler.post { attachMainBridge(20) }
    }
  }

  private fun attachMainBridge(attemptsLeft: Int): Boolean {
    if (bridgeAttached) return true

    val candidates = mutableListOf<Any>()
    collectBridgeViews(window.decorView, candidates)
    collectBridgeInActivity(candidates)

    val uniqueCandidates = candidates.distinctBy { System.identityHashCode(it) }
    val attachedTargets = uniqueCandidates.filter { addJsInterface(it, androidBridge) }

    if (attachedTargets.isNotEmpty()) {
      mainWebView = attachedTargets.firstOrNull { !isCfWebView(it) } ?: attachedTargets.first()
      bridgeAttached = true
      attachedTargets.forEach { notifyBridgeReady(it) }
      return true
    }

    if (attemptsLeft > 0) {
      handler.postDelayed({ attachMainBridge(attemptsLeft - 1) }, 300)
    }

    return false
  }

  private fun collectBridgeInActivity(targets: MutableList<Any>) {
    var current: Class<*>? = this.javaClass
    while (current != null) {
      current.declaredFields.forEach { field ->
        try {
          field.isAccessible = true
          val value = field.get(this)
          if (value != null && supportsBridge(value) && !isCfWebView(value)) {
            targets.add(value)
          }
        } catch (_: Exception) {
        }
      }
      current = current.superclass
    }
  }

  private fun collectBridgeViews(view: View, targets: MutableList<Any>) {
    if (supportsBridge(view) && !isCfWebView(view)) {
      targets.add(view)
    }
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        val child = view.getChildAt(i)
        collectBridgeViews(child, targets)
      }
    }
  }

  private fun isCfWebView(view: Any): Boolean {
    return view === cfFetchWebView
  }

  private fun supportsBridge(view: Any): Boolean {
    val methods = view.javaClass.methods
    val hasAdd = methods.any { it.name == "addJavascriptInterface" && it.parameterTypes.size == 2 }
    val hasEval = methods.any { it.name == "evaluateJavascript" && it.parameterTypes.size == 2 }
    return hasAdd && hasEval
  }

  private fun addJsInterface(target: Any, bridge: Any): Boolean {
    return try {
      val method = target.javaClass.getMethod(
        "addJavascriptInterface",
        Any::class.java,
        String::class.java
      )
      method.invoke(target, bridge, "ShamelaAndroid")
      true
    } catch (error: Exception) {
      false
    }
  }

  private fun notifyBridgeReady(target: Any) {
    val script = """
      window.__shamelaAndroidReady = true;
      window.dispatchEvent(new CustomEvent('shamela-android-ready'));
    """.trimIndent()
    evaluateJavascript(target, script)
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun ensureCfFetchWebView(): WebView {
    val existing = cfFetchWebView
    if (existing != null) return existing
    val webView = WebView(this)
    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    CookieManager.getInstance().setAcceptCookie(true)
    webView.webViewClient = object : WebViewClient() {
      override fun onPageFinished(view: WebView?, url: String?) {
        cfFetchReady = true
        processPending()
      }
    }
    webView.addJavascriptInterface(androidBridge, "ShamelaAndroid")
    cfFetchWebView = webView
    return webView
  }

  private fun launchUnlockActivity(url: String) {
    val intent = Intent(this, CfUnlockActivity::class.java)
    intent.putExtra(CfUnlockActivity.EXTRA_URL, url)
    cfUnlockLauncher.launch(intent)
  }

  private fun onCfUnlocked() {
    if (cfUnlocked) return
    cfUnlocked = true
    unlockInProgress = false
    cfFetchReady = false
    val fetchWebView = ensureCfFetchWebView()
    fetchWebView.loadUrl("https://shamela.ws/")
    CookieManager.getInstance().flush()
  }

  private fun failPendingRequests(message: String) {
    while (pendingRequests.isNotEmpty()) {
      val request = pendingRequests.removeFirst()
      emitToMain(request.requestId, null, message)
    }
  }

  private fun processPending() {
    if (!cfFetchReady) return
    while (pendingRequests.isNotEmpty()) {
      val request = pendingRequests.removeFirst()
      performFetch(request)
    }
  }

  private fun performFetch(request: FetchRequest) {
    val webView = ensureCfFetchWebView()
    val payloadJson = request.optionsJson ?: "{}"
    val js = """
      (function() {
        const payload = $payloadJson;
        const request = {
          method: payload.method || 'GET',
          headers: payload.headers || {},
          credentials: 'include'
        };
        if (payload.body) request.body = payload.body;
        fetch(${JSONObject.quote(request.url)}, request)
          .then(r => r.text())
          .then(html => {
            ShamelaAndroid.onFetchResult(${JSONObject.quote(request.requestId)}, html, null);
          })
          .catch(err => {
            ShamelaAndroid.onFetchResult(${JSONObject.quote(request.requestId)}, null, err.message || 'fetch_failed');
          });
      })();
    """.trimIndent()
    webView.evaluateJavascript(js, null)
  }

  private fun emitToMain(requestId: String, html: String?, error: String?) {
    val main = mainWebView ?: return
    val payload = JSONObject()
    payload.put("requestId", requestId)
    if (html != null) payload.put("html", html)
    if (error != null) payload.put("error", error)
    val script = """
      window.dispatchEvent(new CustomEvent('shamela-android-fetch', { detail: ${payload.toString()} }));
    """.trimIndent()
    evaluateJavascript(main, script)
  }

  private fun evaluateJavascript(target: Any, script: String) {
    try {
      val method = target.javaClass.getMethod("evaluateJavascript", String::class.java, android.webkit.ValueCallback::class.java)
      method.invoke(target, script, null)
    } catch (error: Exception) {
      // Silently fail
    }
  }

  inner class AndroidBridge {
    @JavascriptInterface
    fun fetch(requestId: String, url: String, optionsJson: String?) {
      runOnUiThread {
        if (!cfUnlocked) {
          pendingRequests.add(FetchRequest(requestId, url, optionsJson))
          if (!unlockInProgress) {
            unlockInProgress = true
            launchUnlockActivity(url)
          }
          return@runOnUiThread
        }
        performFetch(FetchRequest(requestId, url, optionsJson))
      }
    }

    @JavascriptInterface
    fun onFetchResult(requestId: String, html: String?, error: String?) {
      runOnUiThread {
        emitToMain(requestId, html, error)
      }
    }
  }
}
