import { gunzipSync } from 'node:zlib';
export function htmlPayload(html: string) {
  const packed = JSON.parse(
    html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)![1],
  );
  return JSON.parse(gunzipSync(Buffer.from(packed.data, 'base64')).toString());
}
