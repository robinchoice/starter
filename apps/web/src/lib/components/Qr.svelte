<script lang="ts">
  import qrcode from 'qrcode-generator';

  let { text, label }: { text: string; label: string } = $props();

  // One path of dark modules inside the quiet zone of four, no inline styles for the CSP
  const qr = $derived.by(() => {
    const code = qrcode(0, 'M');
    code.addData(text);
    code.make();
    const size = code.getModuleCount();
    let path = '';
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (code.isDark(row, col)) path += `M${col + 4},${row + 4}h1v1h-1z`;
      }
    }
    return { size: size + 8, path };
  });
</script>

<svg viewBox="0 0 {qr.size} {qr.size}" role="img" aria-label={label} shape-rendering="crispEdges">
  <rect width={qr.size} height={qr.size} fill="#fff" />
  <path d={qr.path} fill="#000" />
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    max-width: 280px;
    height: auto;
    border-radius: 8px;
  }
</style>
