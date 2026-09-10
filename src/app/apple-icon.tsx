import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const EGG = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 200 200">
<path d="M56 118c-14-6-24 6-20 20 3 11-6 15-6 24 0 16 32 22 70 22s70-6 70-22c0-9-9-13-6-24 4-14-6-26-20-20-8 3-13-2-18-8-9-11-19-11-26 0-5 6-10 11-18 8Z" fill="#fff"/>
<circle cx="100" cy="102" r="42" fill="#FFFDF6"/>
<circle cx="87" cy="99" r="5.5" fill="#1A1512"/><circle cx="113" cy="99" r="5.5" fill="#1A1512"/>
<path d="M89 114c3 6 19 6 22 0" stroke="#1A1512" stroke-width="5" stroke-linecap="round" fill="none"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4C430",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={150} height={150} src={`data:image/svg+xml;utf8,${encodeURIComponent(EGG)}`} alt="" />
      </div>
    ),
    { ...size },
  );
}
