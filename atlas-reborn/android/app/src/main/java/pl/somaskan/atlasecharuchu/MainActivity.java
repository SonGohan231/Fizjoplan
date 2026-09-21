package pl.somaskan.atlasecharuchu;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

/** Offline game host. No network permission, no external navigation, scoped document export. */
public final class MainActivity extends Activity {
 private static final String HOST="appassets.androidplatform.net";
 private static final int IMPORT=10,EXPORT=11;
 private WebView web;
 private ValueCallback<Uri[]> chooser;
 private String pending;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);web=new WebView(this);setContentView(web);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  web.setBackgroundColor(0xff081b23);WebView.setWebContentsDebuggingEnabled(false);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setMediaPlaybackRequiresUserGesture(false);s.setSupportZoom(false);
  if(android.os.Build.VERSION.SDK_INT>=28){getWindow().getAttributes().layoutInDisplayCutoutMode=android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;}
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !HOST.equals(r.getUrl().getHost());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest request){
    Uri u=request.getUrl();if(!"https".equals(u.getScheme())||!HOST.equals(u.getHost()))return error(403,"Forbidden");
    String p=u.getPath();if(p==null||p.equals("/"))p="/index.html";while(p.startsWith("/"))p=p.substring(1);if(p.contains(".."))return error(403,"Forbidden");
    try{String mime=mime(p);HashMap<String,String> h=new HashMap<>();h.put("Cache-Control","no-cache");h.put("X-Content-Type-Options","nosniff");return new WebResourceResponse(mime,mime.startsWith("text/")||mime.contains("json")?"UTF-8":null,200,"OK",h,getAssets().open(p));}catch(IOException ex){return error(404,"Not Found");}
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){if(chooser!=null)chooser.onReceiveValue(null);chooser=cb;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");try{startActivityForResult(i,IMPORT);return true;}catch(Exception e){chooser=null;Toast.makeText(MainActivity.this,"Nie można otworzyć pliku.",Toast.LENGTH_LONG).show();return false;}}
  });
  web.addJavascriptInterface(new Bridge(),"AndroidBridge");web.loadUrl("https://"+HOST+"/index.html");
 }
 private static WebResourceResponse error(int code,String reason){return new WebResourceResponse("text/plain","UTF-8",code,reason,null,new ByteArrayInputStream(new byte[0]));}
 private static String mime(String p){if(p.endsWith(".html"))return "text/html";if(p.endsWith(".js"))return "text/javascript";if(p.endsWith(".css"))return "text/css";if(p.endsWith(".json"))return "application/json";if(p.endsWith(".png"))return "image/png";if(p.endsWith(".wav"))return "audio/wav";if(p.endsWith(".ogg"))return "audio/ogg";return "application/octet-stream";}
 public final class Bridge{
  @JavascriptInterface public void saveTextFile(String name,String content){if(content==null||content.length()>2000000)return;runOnUiThread(()->{pending=content;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"Atlas-Echa-Ruchu-zapis.json");try{startActivityForResult(i,EXPORT);}catch(Exception ex){pending=null;Toast.makeText(MainActivity.this,"Eksport niedostępny.",Toast.LENGTH_LONG).show();}});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==IMPORT){if(chooser!=null)chooser.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);chooser=null;}else if(request==EXPORT){if(result==RESULT_OK&&data!=null&&data.getData()!=null&&pending!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException();out.write(pending.getBytes(StandardCharsets.UTF_8));Toast.makeText(this,"Zapis wyeksportowany.",Toast.LENGTH_SHORT).show();}catch(Exception ex){Toast.makeText(this,"Nie udało się zapisać pliku.",Toast.LENGTH_LONG).show();}}pending=null;}}
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("document.dispatchEvent(new Event('atlas:pause'))",null);web.onPause();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){if(web!=null)web.evaluateJavascript("document.dispatchEvent(new Event('atlas:back'))",null);}
 @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(web!=null)web.destroy();super.onDestroy();}
}
