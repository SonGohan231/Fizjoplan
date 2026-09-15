package pl.fizjogabinet.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class PdfActivity extends Activity {
    public static final String EXTRA_ASSET_PATH = "asset_path";
    private PdfRenderer renderer;
    private ParcelFileDescriptor descriptor;
    private ImageView imageView;
    private TextView pageLabel;
    private Button prevButton, nextButton;
    private int pageIndex = 0;
    private File cachedFile;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(15,76,92));
        String assetPath = getIntent().getStringExtra(EXTRA_ASSET_PATH);
        if (assetPath == null || !assetPath.toLowerCase().endsWith(".pdf")) { finish(); return; }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(245,248,249));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(12,10,12,10);
        toolbar.setBackgroundColor(Color.rgb(15,76,92));
        Button back = new Button(this); back.setText("← Wróć"); back.setOnClickListener(v -> finish()); toolbar.addView(back);
        TextView title = new TextView(this); title.setText("  PDF ćwiczeń"); title.setTextColor(Color.WHITE); title.setTextSize(18); title.setMaxLines(1);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button share = new Button(this); share.setText("Udostępnij"); share.setOnClickListener(v -> sharePdf()); toolbar.addView(share);
        root.addView(toolbar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        imageView = new ImageView(this); imageView.setAdjustViewBounds(true); imageView.setScaleType(ImageView.ScaleType.FIT_CENTER); imageView.setBackgroundColor(Color.WHITE);
        root.addView(imageView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout nav = new LinearLayout(this); nav.setGravity(Gravity.CENTER); nav.setPadding(8,8,8,8);
        prevButton = new Button(this); prevButton.setText("Poprzednia"); prevButton.setOnClickListener(v -> showPage(pageIndex - 1)); nav.addView(prevButton);
        pageLabel = new TextView(this); pageLabel.setPadding(20,0,20,0); pageLabel.setTextSize(16); nav.addView(pageLabel);
        nextButton = new Button(this); nextButton.setText("Następna"); nextButton.setOnClickListener(v -> showPage(pageIndex + 1)); nav.addView(nextButton);
        root.addView(nav);
        setContentView(root);

        try {
            cachedFile = copyAssetToCache(assetPath);
            descriptor = ParcelFileDescriptor.open(cachedFile, ParcelFileDescriptor.MODE_READ_ONLY);
            renderer = new PdfRenderer(descriptor);
            showPage(0);
        } catch (Exception e) {
            title.setText("  Nie udało się otworzyć PDF");
            imageView.setVisibility(View.GONE); nav.setVisibility(View.GONE);
        }
    }

    private File copyAssetToCache(String assetPath) throws Exception {
        File dir = new File(getCacheDir(), "pdf");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Brak katalogu cache");
        File out = new File(dir, assetPath.replace('/', '_').replace('\\', '_'));
        try (InputStream in = getAssets().open(assetPath); FileOutputStream fos = new FileOutputStream(out)) {
            byte[] buf = new byte[16384]; int n; while ((n=in.read(buf))!=-1) fos.write(buf,0,n);
        }
        return out;
    }

    private void showPage(int index) {
        if (renderer == null || index < 0 || index >= renderer.getPageCount()) return;
        pageIndex = index;
        try (PdfRenderer.Page page = renderer.openPage(index)) {
            int maxWidth = Math.max(getResources().getDisplayMetrics().widthPixels * 2, 1200);
            float scale = (float)maxWidth / page.getWidth();
            Bitmap bitmap = Bitmap.createBitmap(Math.max(1,Math.round(page.getWidth()*scale)), Math.max(1,Math.round(page.getHeight()*scale)), Bitmap.Config.ARGB_8888);
            bitmap.eraseColor(Color.WHITE);
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
            imageView.setImageBitmap(bitmap);
        }
        pageLabel.setText((pageIndex+1) + " / " + renderer.getPageCount());
        prevButton.setEnabled(pageIndex > 0); nextButton.setEnabled(pageIndex < renderer.getPageCount()-1);
    }

    private void sharePdf() {
        if (cachedFile == null || !cachedFile.exists()) return;
        Uri uri = FileProvider.getUriForFile(this, getPackageName()+".files", cachedFile);
        Intent share = new Intent(Intent.ACTION_SEND); share.setType("application/pdf"); share.putExtra(Intent.EXTRA_STREAM, uri); share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(share, "Udostępnij PDF"));
    }

    @Override protected void onDestroy() {
        if (renderer != null) renderer.close();
        if (descriptor != null) try { descriptor.close(); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
