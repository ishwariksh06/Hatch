import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const EGG = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 200 200">
<g stroke="#F4C430" stroke-width="9" stroke-linecap="round">
<line x1="100" y1="8" x2="100" y2="28"/><line x1="52" y1="20" x2="62" y2="38"/>
<line x1="148" y1="20" x2="138" y2="38"/><line x1="24" y1="52" x2="42" y2="62"/>
<line x1="176" y1="52" x2="158" y2="62"/></g>
<path d="M56 118c-14-6-24 6-20 20 3 11-6 15-6 24 0 16 32 22 70 22s70-6 70-22c0-9-9-13-6-24 4-14-6-26-20-20-8 3-13-2-18-8-9-11-19-11-26 0-5 6-10 11-18 8Z" fill="#fff" stroke="#E8D9BB" stroke-width="5"/>
<circle cx="100" cy="102" r="42" fill="#F4C430"/>
<circle cx="76" cy="112" r="6" fill="#FF8A5B"/><circle cx="124" cy="112" r="6" fill="#FF8A5B"/>
<circle cx="87" cy="99" r="5.5" fill="#1A1512"/><circle cx="113" cy="99" r="5.5" fill="#1A1512"/>
<path d="M89 114c3 6 19 6 22 0" stroke="#1A1512" stroke-width="5" stroke-linecap="round" fill="none"/>
</svg>`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFDF6",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={420}
          height={420}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(EGG)}`}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
