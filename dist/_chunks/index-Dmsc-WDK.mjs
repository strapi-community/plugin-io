import { useRef, useEffect, forwardRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useTheme } from "styled-components";
const __variableDynamicImportRuntimeHelper = (glob, path, segs) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(
      reject.bind(
        null,
        new Error(
          "Unknown variable dynamic import: " + path + (path.split("/").length !== segs ? ". Note that variables only represent file names one level deep." : "")
        )
      )
    );
  });
};
const PLUGIN_ID = "io";
const Initializer = ({ setPlugin }) => {
  const ref = useRef(setPlugin);
  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const SvgAlien = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 2A12.014 12.014 0 0 0 4 14c0 3 1.57 6.883 4.201 10.375C10.85 27.894 13.764 30 16 30s5.151-2.101 7.799-5.625C26.43 20.875 28 17 28 14A12.014 12.014 0 0 0 16 2M8 14.5A1.5 1.5 0 0 1 9.5 13a4.5 4.5 0 0 1 4.5 4.5 1.5 1.5 0 0 1-1.5 1.5A4.5 4.5 0 0 1 8 14.5M18 25h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2m1.5-6a1.5 1.5 0 0 1-1.5-1.5 4.5 4.5 0 0 1 4.5-4.5 1.5 1.5 0 0 1 1.5 1.5 4.5 4.5 0 0 1-4.5 4.5" }) });
};
forwardRef(SvgAlien);
const SvgArchive = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 6H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2v11a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V13a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2m-9 12h-6a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2m9-7H4V8h24z" }) });
};
forwardRef(SvgArchive);
const SvgArrowClockwise = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30.5 7v6a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1 0-3h2.137l-2.375-2.173-.047-.046a9.5 9.5 0 1 0-6.84 16.219H16a9.44 9.44 0 0 0 6.519-2.59 1.5 1.5 0 1 1 2.061 2.181A12.43 12.43 0 0 1 16 28.5h-.171a12.5 12.5 0 1 1 8.985-21.368L27.5 9.59V7a1.5 1.5 0 0 1 3 0" }) });
};
forwardRef(SvgArrowClockwise);
const SvgArrowDown = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m26.061 19.061-9 9a1.503 1.503 0 0 1-2.125 0l-9-9a1.503 1.503 0 1 1 2.125-2.125l6.439 6.439V5a1.5 1.5 0 1 1 3 0v18.375l6.439-6.44a1.502 1.502 0 1 1 2.125 2.125z" }) });
};
forwardRef(SvgArrowDown);
const SvgArrowLeft = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5H8.625l6.44 6.439a1.502 1.502 0 1 1-2.125 2.125l-9-9a1.5 1.5 0 0 1 0-2.125l9-9a1.503 1.503 0 0 1 2.125 2.125L8.625 14.5H27a1.5 1.5 0 0 1 1.5 1.5" }) });
};
forwardRef(SvgArrowLeft);
const SvgArrowLineLeft = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, fill, viewBox: "0 0 16 16", stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M14.75 8a.75.75 0 0 1-.75.75H6.813l3.22 3.22a.751.751 0 1 1-1.063 1.062l-4.5-4.5a.75.75 0 0 1 0-1.063l4.5-4.5a.751.751 0 0 1 1.063 1.063L6.813 7.25H14a.75.75 0 0 1 .75.75M2.5 1.75a.75.75 0 0 0-.75.75v11a.75.75 0 0 0 1.5 0v-11a.75.75 0 0 0-.75-.75" }) });
};
forwardRef(SvgArrowLineLeft);
const SvgArrowLineRight = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, fill, viewBox: "0 0 16 16", stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M11.53 7.47a.75.75 0 0 1 0 1.062l-4.5 4.5a.751.751 0 1 1-1.062-1.063l3.22-3.219H2a.75.75 0 1 1 0-1.5h7.188L5.969 4.03a.751.751 0 1 1 1.063-1.062zm1.97-5.72a.75.75 0 0 0-.75.75v11a.75.75 0 0 0 1.5 0v-11a.75.75 0 0 0-.75-.75" }) });
};
forwardRef(SvgArrowLineRight);
const SvgArrowRight = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m28.061 17.061-9 9a1.503 1.503 0 1 1-2.125-2.125l6.439-6.436H5a1.5 1.5 0 1 1 0-3h18.375l-6.436-6.44a1.503 1.503 0 0 1 2.125-2.125l9 9a1.5 1.5 0 0 1-.003 2.126" }) });
};
forwardRef(SvgArrowRight);
const SvgArrowUp = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26.061 15.061a1.5 1.5 0 0 1-2.125 0L17.5 8.625V27a1.5 1.5 0 1 1-3 0V8.625l-6.439 6.436a1.503 1.503 0 1 1-2.125-2.125l9-9a1.5 1.5 0 0 1 2.125 0l9 9a1.5 1.5 0 0 1 0 2.125" }) });
};
forwardRef(SvgArrowUp);
const SvgArrowsCounterClockwise = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M11 13.5H5A1.5 1.5 0 0 1 3.5 12V6a1.5 1.5 0 0 1 3 0v1.733C8.581 5.683 11.786 3.5 16 3.5c5.558 0 8.92 3.299 9.061 3.439a1.5 1.5 0 0 1-2.117 2.125C22.889 9.01 20.25 6.5 16 6.5c-3.625 0-6.367 2.21-8 4h3a1.5 1.5 0 1 1 0 3m16 5h-6a1.5 1.5 0 1 0 0 3h3c-1.625 1.79-4.375 4-8 4-4.25 0-6.889-2.511-6.944-2.565A1.5 1.5 0 0 0 6.94 25.06c.141.141 3.504 3.44 9.061 3.44 4.214 0 7.419-2.183 9.5-4.233V26a1.5 1.5 0 1 0 3 0v-6a1.5 1.5 0 0 0-1.5-1.5" }) });
};
forwardRef(SvgArrowsCounterClockwise);
const SvgArrowsOut = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 256 256", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M220 48v48a12 12 0 0 1-24 0V77l-39.51 39.52a12 12 0 0 1-17-17L179 60h-19a12 12 0 0 1 0-24h48a12 12 0 0 1 12 12M99.51 139.51 60 179v-19a12 12 0 0 0-24 0v48a12 12 0 0 0 12 12h48a12 12 0 0 0 0-24H77l39.52-39.51a12 12 0 0 0-17-17Z" }) });
};
forwardRef(SvgArrowsOut);
const SvgBell = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27.725 21.993C27.031 20.798 26 17.416 26 13a10 10 0 0 0-20 0c0 4.418-1.032 7.797-1.726 8.993A2 2 0 0 0 6 25h5.101a5 5 0 0 0 9.798 0H26a2 2 0 0 0 1.725-3.008M16 27a3 3 0 0 1-2.828-2h5.656A3 3 0 0 1 16 27" }) });
};
forwardRef(SvgBell);
const SvgBold = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M22.135 14.308A6.001 6.001 0 0 0 17.5 4.5H9A1.5 1.5 0 0 0 7.5 6v19A1.5 1.5 0 0 0 9 26.5h10a6.5 6.5 0 0 0 3.135-12.192M10.5 7.5h7a3 3 0 0 1 0 6h-7zm8.5 16h-8.5v-7H19a3.5 3.5 0 1 1 0 7" }) });
};
forwardRef(SvgBold);
const SvgBook = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 4v20a1 1 0 0 1-1 1H9a2 2 0 0 0-2 2h17a1 1 0 0 1 0 2H6a1 1 0 0 1-1-1V7a4 4 0 0 1 4-4h17a1 1 0 0 1 1 1" }) });
};
forwardRef(SvgBook);
const SvgBriefcase = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M19 14a1 1 0 0 1-1 1h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 1 1m10-5v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1h5a2 2 0 0 1 2 2M12 7h8V6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1zm15 7.201V9H5v5.201A23 23 0 0 0 16 17a23 23 0 0 0 11-2.799" }) });
};
forwardRef(SvgBriefcase);
const SvgBulletList = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M9.5 8A1.5 1.5 0 0 1 11 6.5h16a1.5 1.5 0 0 1 0 3H11A1.5 1.5 0 0 1 9.5 8M27 14.5H11a1.5 1.5 0 1 0 0 3h16a1.5 1.5 0 1 0 0-3m0 8H11a1.5 1.5 0 1 0 0 3h16a1.5 1.5 0 1 0 0-3M5.5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0-8a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4" }) });
};
forwardRef(SvgBulletList);
const SvgCalendar = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26 4h-3V3a1 1 0 0 0-2 0v1H11V3a1 1 0 0 0-2 0v1H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 6H6V6h3v1a1 1 0 0 0 2 0V6h10v1a1 1 0 0 0 2 0V6h3z" }) });
};
const ForwardRef$2x = forwardRef(SvgCalendar);
const SvgCar = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30 14h-1.35l-3.472-7.812A2 2 0 0 0 23.35 5H8.65a2 2 0 0 0-1.828 1.188L3.35 14H2a1 1 0 0 0 0 2h1v10a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-2h12v2a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V16h1a1 1 0 0 0 0-2m-20 6H8a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2m12 0a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2z" }) });
};
forwardRef(SvgCar);
const SvgCaretDown = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m26.708 12.708-10 10a1 1 0 0 1-1.415 0l-10-10A1 1 0 0 1 6 11h20a1 1 0 0 1 .707 1.707" }) });
};
const ForwardRef$2v = forwardRef(SvgCaretDown);
const SvgCaretUp = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26.924 20.383A1 1 0 0 1 26 21H6a1 1 0 0 1-.708-1.707l10-10a1 1 0 0 1 1.415 0l10 10a1 1 0 0 1 .217 1.09" }) });
};
forwardRef(SvgCaretUp);
const SvgCast = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M7 26a1 1 0 1 1-2 0 1 1 0 0 0-1-1 1 1 0 0 1 0-2 3 3 0 0 1 3 3m-3-7a1 1 0 0 0 0 2 5 5 0 0 1 5 5 1 1 0 1 0 2 0 7.01 7.01 0 0 0-7-7m0-4a1 1 0 0 0 0 2 9.01 9.01 0 0 1 9 9 1 1 0 0 0 2 0A11.01 11.01 0 0 0 4 15M27 5H5a2 2 0 0 0-2 2v5a1 1 0 0 0 1 1 13.014 13.014 0 0 1 13 13 1 1 0 0 0 1 1h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2" }) });
};
forwardRef(SvgCast);
const SvgCastleTurret = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M25 3h-1a2 2 0 0 0-2 2v2h-3.5V5a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v2H10V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5.586A1.98 1.98 0 0 0 5.586 12L7 13.414V27a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V13.414L26.414 12A1.98 1.98 0 0 0 27 10.586V5a2 2 0 0 0-2-2m-6 24h-6v-8a3 3 0 0 1 6 0z" }) });
};
forwardRef(SvgCastleTurret);
const SvgChartBubble = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 5H5a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m0 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m-5-2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m-3-5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m-3 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3M25 24H7a1 1 0 0 1-1-1V9a1 1 0 0 1 2 0v13h17a1 1 0 0 1 0 2" }) });
};
forwardRef(SvgChartBubble);
const SvgChartCircle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M3.094 14.443a12.8 12.8 0 0 1 2.914-6.72 2 2 0 0 1 2.953-.138l3.459 3.533a1.98 1.98 0 0 1 .211 2.56 3.2 3.2 0 0 0-.462.968.5.5 0 0 1-.478.354h-8.1a.5.5 0 0 1-.497-.557m14.08-11.435A2 2 0 0 0 15 5v5.084a1.98 1.98 0 0 0 1.656 1.97 4 4 0 0 1 .677 7.72.51.51 0 0 0-.333.476v8.154a.5.5 0 0 0 .558.5A13.04 13.04 0 0 0 29 16.185C29.094 9.4 23.899 3.61 17.174 3.008M14.656 19.77a4 4 0 0 1-2.425-2.427.51.51 0 0 0-.475-.343H3.59a.5.5 0 0 0-.5.556A13.01 13.01 0 0 0 14.443 28.91a.5.5 0 0 0 .556-.5V20.25a.51.51 0 0 0-.343-.48" }) });
};
forwardRef(SvgChartCircle);
const SvgChartPie = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m0 2a11 11 0 0 1 8.984 4.659L16 14.845zm0 22a11 11 0 0 1-8.984-4.659l18.97-10.951A11 11 0 0 1 16 27" }) });
};
forwardRef(SvgChartPie);
const SvgCheck = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m29.061 10.061-16 16a1.5 1.5 0 0 1-2.125 0l-7-7a1.504 1.504 0 0 1 2.125-2.125L12 22.875 26.939 7.939a1.502 1.502 0 1 1 2.125 2.125z" }) });
};
const ForwardRef$2o = forwardRef(SvgCheck);
const SvgCheckCircle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m5.708 10.708-7 7a1 1 0 0 1-1.415 0l-3-3a1 1 0 0 1 1.415-1.415L14 18.586l6.293-6.293a1 1 0 0 1 1.415 1.415" }) });
};
forwardRef(SvgCheckCircle);
const SvgCheckCircleEmpty = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M176.49 95.51a12 12 0 0 1 0 17l-56 56a12 12 0 0 1-17 0l-24-24a12 12 0 1 1 17-17L112 143l47.51-47.52a12 12 0 0 1 16.98.03M236 128A108 108 0 1 1 128 20a108.12 108.12 0 0 1 108 108m-24 0a84 84 0 1 0-84 84 84.09 84.09 0 0 0 84-84" }) });
};
forwardRef(SvgCheckCircleEmpty);
const SvgChevronDown = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m27.061 13.061-10 10a1.503 1.503 0 0 1-2.125 0l-10-10a1.503 1.503 0 1 1 2.125-2.125L16 19.875l8.939-8.94a1.502 1.502 0 1 1 2.125 2.125z" }) });
};
forwardRef(SvgChevronDown);
const SvgChevronLeft = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M21.061 24.939a1.503 1.503 0 0 1-2.125 2.125l-10-10a1.5 1.5 0 0 1 0-2.125l10-10a1.503 1.503 0 0 1 2.125 2.125L12.125 16z" }) });
};
const ForwardRef$2k = forwardRef(SvgChevronLeft);
const SvgChevronRight = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m23.061 17.061-10 10a1.503 1.503 0 0 1-2.125-2.125L19.875 16l-8.936-8.939a1.502 1.502 0 1 1 2.125-2.125l10 10a1.5 1.5 0 0 1-.003 2.125" }) });
};
const ForwardRef$2j = forwardRef(SvgChevronRight);
const SvgChevronUp = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27.061 21.061a1.503 1.503 0 0 1-2.125 0L16 12.125l-8.939 8.936a1.503 1.503 0 0 1-2.125-2.125l10-10a1.5 1.5 0 0 1 2.125 0l10 10a1.5 1.5 0 0 1 0 2.125" }) });
};
forwardRef(SvgChevronUp);
const SvgClock = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m7 14h-7a1 1 0 0 1-1-1V9a1 1 0 0 1 2 0v6h6a1 1 0 0 1 0 2" }) });
};
const ForwardRef$2h = forwardRef(SvgClock);
const SvgClockCounterClockwise = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 16a12 12 0 0 1-20.236 8.728 1.002 1.002 0 0 1 1.375-1.456 10 10 0 1 0-.21-14.343c-.441.446-.857.885-1.26 1.321l2.039 2.043A1 1 0 0 1 9 14H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1.707-.707L6.25 8.838c.402-.437.817-.875 1.258-1.32A12 12 0 0 1 28 16M16 9a1 1 0 0 0-1 1v6a1 1 0 0 0 .485.858l5 3a.999.999 0 0 0 1.486-1.1 1 1 0 0 0-.456-.616L17 15.434V10a1 1 0 0 0-1-1" }) });
};
forwardRef(SvgClockCounterClockwise);
const SvgCloud = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M20.008 5a11.01 11.01 0 0 0-9.847 6.084A10.9 10.9 0 0 0 9 15.966 1.023 1.023 0 0 1 8.071 17 1 1 0 0 1 7 16a13 13 0 0 1 .668-4.115.5.5 0 0 0-.594-.647A8.01 8.01 0 0 0 1 19c0 4.399 3.719 8 8.125 8H20a11.01 11.01 0 0 0 10.991-11.435C30.764 9.693 25.884 5 20.008 5" }) });
};
forwardRef(SvgCloud);
const SvgCloudUpload = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30.991 15.565C30.764 9.693 25.884 5 20.008 5a11.01 11.01 0 0 0-9.847 6.084A10.9 10.9 0 0 0 9 15.966 1.023 1.023 0 0 1 8.071 17 1 1 0 0 1 7 16a13 13 0 0 1 .668-4.115.5.5 0 0 0-.594-.647A8.01 8.01 0 0 0 1 19c0 4.399 3.719 8 8.125 8H20a11.01 11.01 0 0 0 10.991-11.435m-7.283 3.143a1 1 0 0 1-1.415 0L20 16.414V24a1 1 0 0 1-2 0v-7.586l-2.293 2.293a1 1 0 0 1-1.415-1.415l4-4a1 1 0 0 1 1.415 0l4 4a1 1 0 0 1 0 1.415" }) });
};
forwardRef(SvgCloudUpload);
const SvgCode = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M8.96 12.153 4.342 16l4.618 3.848a1.5 1.5 0 1 1-1.92 2.305l-6-5a1.5 1.5 0 0 1 0-2.305l6-5a1.5 1.5 0 0 1 1.92 2.304m22 2.694-6-5a1.5 1.5 0 1 0-1.92 2.306L27.658 16l-4.618 3.848a1.5 1.5 0 1 0 1.92 2.305l6-5a1.5 1.5 0 0 0 0-2.305M20.512 3.59a1.5 1.5 0 0 0-1.922.898l-8 22a1.5 1.5 0 0 0 2.82 1.024l8-22a1.5 1.5 0 0 0-.898-1.922" }) });
};
forwardRef(SvgCode);
const SvgCodeBlock = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M200 40h-32a16 16 0 0 0-16-16H32a16 16 0 0 0-16 16v80a16 16 0 0 0 16 16h8v64a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-93.66 21.66a8 8 0 0 1 11.32-11.32l24 24a8 8 0 0 1 0 11.32l-24 24a8 8 0 0 1-11.32-11.32L124.69 80Zm-64 24a8 8 0 0 1 0-11.32l24-24a8 8 0 0 1 11.32 11.32L59.31 80l18.35 18.34a8 8 0 0 1-11.32 11.32ZM200 200H56v-64h96a16 16 0 0 0 16-16V56h32Z" }) });
};
forwardRef(SvgCodeBlock);
const SvgCoffee = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26 10H4a1 1 0 0 0-1 1v6a12.04 12.04 0 0 0 4.068 9H4a1 1 0 0 0 0 2h22a1 1 0 0 0 0-2h-3.067a12.1 12.1 0 0 0 3.375-5.011A5 5 0 0 0 31 16v-1a5 5 0 0 0-5-5m3 6a3 3 0 0 1-2.15 2.875Q27 17.944 27 17v-4.828A3 3 0 0 1 29 15zM14 7V3a1 1 0 0 1 2 0v4a1 1 0 0 1-2 0m4 0V3a1 1 0 0 1 2 0v4a1 1 0 0 1-2 0m-8 0V3a1 1 0 0 1 2 0v4a1 1 0 0 1-2 0" }) });
};
forwardRef(SvgCoffee);
const SvgCog = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29.743 13.401a1 1 0 0 0-.487-.675l-3.729-2.125-.015-4.202a1 1 0 0 0-.353-.76 14 14 0 0 0-4.59-2.584 1 1 0 0 0-.808.074L16 5.23l-3.765-2.106a1 1 0 0 0-.809-.075 14 14 0 0 0-4.585 2.594 1 1 0 0 0-.354.758L6.47 10.61 2.74 12.734a1 1 0 0 0-.486.675 13.3 13.3 0 0 0 0 5.195 1 1 0 0 0 .486.675l3.729 2.125.015 4.204a1 1 0 0 0 .353.76 14 14 0 0 0 4.59 2.583 1 1 0 0 0 .808-.073L16 26.768l3.765 2.107a1.013 1.013 0 0 0 .809.073 14 14 0 0 0 4.585-2.592 1 1 0 0 0 .354-.759l.018-4.206 3.729-2.125a1 1 0 0 0 .486-.675c.34-1.713.338-3.477-.003-5.19M16 21a5 5 0 1 1 0-10 5 5 0 0 1 0 10" }) });
};
forwardRef(SvgCog);
const SvgCollapse = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M18.5 12V6a1.5 1.5 0 1 1 3 0v4.5H26a1.5 1.5 0 1 1 0 3h-6a1.5 1.5 0 0 1-1.5-1.5M12 18.5H6a1.5 1.5 0 1 0 0 3h4.5V26a1.5 1.5 0 1 0 3 0v-6a1.5 1.5 0 0 0-1.5-1.5m14 0h-6a1.5 1.5 0 0 0-1.5 1.5v6a1.5 1.5 0 1 0 3 0v-4.5H26a1.5 1.5 0 1 0 0-3m-14-14A1.5 1.5 0 0 0 10.5 6v4.5H6a1.5 1.5 0 1 0 0 3h6a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 12 4.5" }) });
};
forwardRef(SvgCollapse);
const SvgCommand = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M22.5 17.5h-2v-3h2a5 5 0 1 0-5-5v2h-3v-2a5 5 0 1 0-5 5h2v3h-2a5 5 0 1 0 5 5v-2h3v2a5 5 0 1 0 5-5m-2-8a2 2 0 1 1 2 2h-2zm-13 0a2 2 0 0 1 4 0v2h-2a2 2 0 0 1-2-2m4 13a2 2 0 1 1-2-2h2zm3-8h3v3h-3zm8 10a2 2 0 0 1-2-2v-2h2a2 2 0 0 1 0 4" }) });
};
forwardRef(SvgCommand);
const SvgCrop = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30.5 24a1.5 1.5 0 0 1-1.5 1.5h-3.5V29a1.5 1.5 0 1 1-3 0v-3.5H8A1.5 1.5 0 0 1 6.5 24V9.5H3a1.5 1.5 0 0 1 0-3h3.5V3a1.5 1.5 0 0 1 3 0v19.5H29a1.5 1.5 0 0 1 1.5 1.5M13 9.5h9.5V19a1.5 1.5 0 1 0 3 0V8A1.5 1.5 0 0 0 24 6.5H13a1.5 1.5 0 0 0 0 3" }) });
};
forwardRef(SvgCrop);
const SvgCross = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26.061 23.939a1.503 1.503 0 0 1-2.125 2.125L16 18.125l-7.939 7.936a1.503 1.503 0 1 1-2.125-2.125L13.875 16 5.939 8.061a1.503 1.503 0 1 1 2.125-2.125L16 13.875l7.939-7.94a1.502 1.502 0 1 1 2.125 2.125L18.125 16z" }) });
};
const ForwardRef$26 = forwardRef(SvgCross);
const SvgCrossCircle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m4.708 16.293a1 1 0 0 1-1.415 1.415L16 17.414l-3.293 3.293a1 1 0 0 1-1.415-1.415L14.587 16l-3.293-3.293a1 1 0 1 1 1.415-1.415L16 14.587l3.293-3.293a1 1 0 0 1 1.415 1.415L17.414 16z" }) });
};
forwardRef(SvgCrossCircle);
const SvgCrown = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30.48 9.524a1.51 1.51 0 0 0-1.668-.213l-6.276 3.125-5.24-8.704a1.514 1.514 0 0 0-2.592 0l-5.24 8.708L3.19 9.315a1.514 1.514 0 0 0-2.113 1.825l4.625 14.17a1 1 0 0 0 1.46.55C7.194 25.841 10.39 24 16 24s8.806 1.841 8.835 1.859a1 1 0 0 0 1.464-.549l4.625-14.166a1.51 1.51 0 0 0-.444-1.62M21.98 19.6a1 1 0 0 1-1.159.811 28.5 28.5 0 0 0-9.652 0 1 1 0 0 1-.348-1.97 30.6 30.6 0 0 1 10.348 0 1 1 0 0 1 .816 1.159z" }) });
};
forwardRef(SvgCrown);
const SvgCursor = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27.414 24a2 2 0 0 1 0 2.829l-.585.585a2 2 0 0 1-2.829 0l-6.906-6.905-2.735 6.292A1.98 1.98 0 0 1 12.533 28h-.098a1.98 1.98 0 0 1-1.801-1.375L4.1 6.615A1.994 1.994 0 0 1 6.615 4.1l20.01 6.534a2 2 0 0 1 .176 3.725l-6.292 2.735z" }) });
};
forwardRef(SvgCursor);
const SvgDatabase = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3C9.271 3 4 6.075 4 10v12c0 3.925 5.271 7 12 7s12-3.075 12-7V10c0-3.925-5.271-7-12-7m10 13c0 1.203-.985 2.429-2.701 3.365C21.366 20.419 18.774 21 16 21s-5.366-.581-7.299-1.635C6.985 18.429 6 17.203 6 16v-2.08C8.133 15.795 11.779 17 16 17s7.868-1.21 10-3.08zm-2.701 9.365C21.366 26.419 18.774 27 16 27s-5.366-.581-7.299-1.635C6.985 24.429 6 23.203 6 22v-2.08C8.133 21.795 11.779 23 16 23s7.868-1.21 10-3.08V22c0 1.203-.985 2.429-2.701 3.365" }) });
};
forwardRef(SvgDatabase);
const SvgDiscuss = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29 12a2 2 0 0 0-2-2h-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16a1 1 0 0 0 1.625.777L9 19.25V23a2 2 0 0 0 2 2h11.699l4.676 3.778A1 1 0 0 0 29 28zm-5.319 11.223a1 1 0 0 0-.625-.223H11v-4h10a2 2 0 0 0 2-2v-5h4v13.906z" }) });
};
forwardRef(SvgDiscuss);
const SvgDownload = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 19v7a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 26v-7a1.5 1.5 0 0 1 3 0v6.5h19V19a1.5 1.5 0 1 1 3 0m-13.561 1.061a1.5 1.5 0 0 0 2.125 0l5-5a1.502 1.502 0 1 0-2.125-2.125L17.5 15.375V5a1.5 1.5 0 1 0-3 0v10.375l-2.439-2.436a1.502 1.502 0 1 0-2.125 2.125z" }) });
};
const ForwardRef$20 = forwardRef(SvgDownload);
const SvgDrag = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M13.5 7.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4m-9 4.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4m9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-9 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4m9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4" }) });
};
forwardRef(SvgDrag);
const SvgDuplicate = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 4H11a1 1 0 0 0-1 1v5H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5h5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1m-1 16h-4v-9a1 1 0 0 0-1-1h-9V6h14z" }) });
};
forwardRef(SvgDuplicate);
const SvgEarth = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m11 13c.001 1.411-.27 2.81-.8 4.118l-5.587-3.437a2 2 0 0 0-.78-.279l-2.853-.385a2.01 2.01 0 0 0-2 .983h-1.09l-.475-.983a1.99 1.99 0 0 0-1.375-1.083l-1-.216.978-1.718h2.088c.338 0 .67-.087.966-.25l1.532-.845q.202-.113.375-.268l3.364-3.042a1.99 1.99 0 0 0 .407-2.458l-.045-.08A11.01 11.01 0 0 1 27 16M5 16a10.94 10.94 0 0 1 1.068-4.725l1.417 3.784a2 2 0 0 0 1.453 1.25l2.678.576.476.99a2.01 2.01 0 0 0 1.8 1.125h.186l-.904 2.029a2 2 0 0 0 .357 2.171l.018.018L16 25.742l-.242 1.25A11.014 11.014 0 0 1 5 16" }) });
};
forwardRef(SvgEarth);
const SvgEarthStriked = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: [
    /* @__PURE__ */ jsx("path", { d: "M20.689 3.88A13 13 0 0 0 16 3a13 13 0 0 0-8.155 23.124l1.02-1.765A11 11 0 0 1 5 16a10.94 10.94 0 0 1 1.068-4.724l1.417 3.784a2 2 0 0 0 1.453 1.25l2.678.576.476.99q.113.226.275.418l1.169-2.025-.121-.25a1.99 1.99 0 0 0-1.375-1.084l-1-.217.978-1.717h2.088c.338 0 .67-.087.966-.25l.726-.4z" }),
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "m24 2.144 1.732 1-1.58 2.736q.54.435 1.036.932A13.01 13.01 0 0 1 29 16a13 13 0 0 1-17.69 12.124l-1.578 2.732-1.732-1zm-.86 5.49-4.936 8.549 1.628.22c.277.037.543.132.78.278l5.588 3.436c.53-1.308.801-2.706.8-4.117a11.01 11.01 0 0 0-3.86-8.367M13.92 23.6l-1.593 2.76a11 11 0 0 0 3.43.631l.242-1.25z", clipRule: "evenodd" })
  ] });
};
forwardRef(SvgEarthStriked);
const SvgEmotionHappy = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m-4.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m10.365 7.5C20.579 21.724 18.441 23 16 23s-4.579-1.275-5.865-3.5a1.001 1.001 0 0 1 1.477-1.31q.157.129.253.31C12.799 20.114 14.266 21 16 21s3.201-.887 4.135-2.5a1 1 0 1 1 1.73 1M20.5 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
forwardRef(SvgEmotionHappy);
const SvgEmotionUnhappy = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m-4.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m10 10.865a1 1 0 0 1-1.365-.365C19.201 20.886 17.734 20 16 20s-3.201.887-4.135 2.5a1.001 1.001 0 1 1-1.73-1C11.421 19.276 13.559 18 16 18s4.579 1.275 5.865 3.5a1 1 0 0 1-.365 1.365M20.5 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
forwardRef(SvgEmotionUnhappy);
const SvgExpand = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27.5 6v5a1.5 1.5 0 1 1-3 0V7.5H21a1.5 1.5 0 0 1 0-3h5A1.5 1.5 0 0 1 27.5 6M11 24.5H7.5V21a1.5 1.5 0 0 0-3 0v5A1.5 1.5 0 0 0 6 27.5h5a1.5 1.5 0 1 0 0-3m15-5a1.5 1.5 0 0 0-1.5 1.5v3.5H21a1.5 1.5 0 1 0 0 3h5a1.5 1.5 0 0 0 1.5-1.5v-5a1.5 1.5 0 0 0-1.5-1.5m-15-15H6A1.5 1.5 0 0 0 4.5 6v5a1.5 1.5 0 0 0 3 0V7.5H11a1.5 1.5 0 0 0 0-3" }) });
};
forwardRef(SvgExpand);
const SvgExternalLink = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 13a1.5 1.5 0 1 1-3 0V8.625l-7.439 7.439a1.503 1.503 0 1 1-2.125-2.125L23.375 6.5H19a1.5 1.5 0 0 1 0-3h8A1.5 1.5 0 0 1 28.5 5zM23 16a1.5 1.5 0 0 0-1.5 1.5v8h-15v-15h8a1.5 1.5 0 1 0 0-3H6A2.5 2.5 0 0 0 3.5 10v16A2.5 2.5 0 0 0 6 28.5h16a2.5 2.5 0 0 0 2.5-2.5v-8.5A1.5 1.5 0 0 0 23 16" }) });
};
const ForwardRef$1U = forwardRef(SvgExternalLink);
const SvgEye = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30.914 15.595c-.044-.099-1.103-2.447-3.457-4.801C24.322 7.657 20.36 6 16 6S7.679 7.657 4.542 10.794C2.19 13.148 1.125 15.5 1.086 15.595a1 1 0 0 0 0 .812c.044.1 1.103 2.447 3.456 4.8C7.68 24.344 11.64 26 16 26s8.321-1.657 11.458-4.792c2.353-2.354 3.412-4.702 3.456-4.8a1 1 0 0 0 0-.813M16 21a5 5 0 1 1 0-10 5 5 0 0 1 0 10" }) });
};
forwardRef(SvgEye);
const SvgEyeStriked = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M6.74 4.328a1 1 0 1 0-1.48 1.345l2.405 2.646c-4.54 2.786-6.493 7.081-6.579 7.276a1 1 0 0 0 0 .813c.044.098 1.103 2.446 3.456 4.8C7.68 24.343 11.64 26 16 26c2.24.013 4.459-.448 6.509-1.354l2.75 3.027a1 1 0 1 0 1.48-1.345zm11.125 15.21a4 4 0 0 1-5.209-5.73zm13.049-3.13c-.053.117-1.319 2.92-4.17 5.475a1 1 0 0 1-1.408-.072L12.675 7.884a1 1 0 0 1 .575-1.66A17 17 0 0 1 16 6c4.36 0 8.321 1.658 11.458 4.794 2.353 2.354 3.412 4.702 3.456 4.801a1 1 0 0 1 0 .813" }) });
};
forwardRef(SvgEyeStriked);
const SvgFaders = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M17 15v12a1 1 0 0 1-2 0V15a1 1 0 0 1 2 0m8 9a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1m3-6h-2V5a1 1 0 0 0-2 0v13h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M7 20a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1m3-6H8V5a1 1 0 0 0-2 0v9H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1m9-6h-2V5a1 1 0 0 0-2 0v3h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1" }) });
};
forwardRef(SvgFaders);
const SvgFeather = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m26.48 16.851-7.474 7.559a1.97 1.97 0 0 1-1.4.585H9.415l-3.707 3.712a1.001 1.001 0 0 1-1.415-1.415l2.823-2.822L15.588 16h10.537a.5.5 0 0 1 .355.851m.607-13.03a8 8 0 0 0-10.737.518l-1.2 1.185a.5.5 0 0 0-.15.351v7.875l6.875-6.875a1 1 0 0 1 1.414 1.414L17.589 14h11.047a.5.5 0 0 0 .445-.27 8.01 8.01 0 0 0-1.994-9.909M7.854 20.904 13 15.758V8.845a.5.5 0 0 0-.851-.355L7.586 13A1.99 1.99 0 0 0 7 14.414v6.136a.5.5 0 0 0 .854.354" }) });
};
forwardRef(SvgFeather);
const SvgFile = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m26.708 10.293-7-7A1 1 0 0 0 19 3H7a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V11a1 1 0 0 0-.293-.707M19 11V5.5l5.5 5.5z" }) });
};
forwardRef(SvgFile);
const SvgFileCsv = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m213.66 82.34-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v76a4 4 0 0 0 4 4h168a4 4 0 0 0 4-4V88a8 8 0 0 0-2.34-5.66M152 88V44l44 44ZM48 180c0 11 7.18 20 16 20a14.18 14.18 0 0 0 10.06-4.5 8.21 8.21 0 0 1 10.9-.91 8 8 0 0 1 .82 11.81A30.06 30.06 0 0 1 64 216c-17.64 0-32-16.15-32-36s14.36-36 32-36a30 30 0 0 1 21.39 9.19 8.26 8.26 0 0 1 .73 11.09 8 8 0 0 1-11.9.38A14.17 14.17 0 0 0 64 160c-8.82 0-16 9-16 20m103.81 16.31a20.82 20.82 0 0 1-9.19 15.23C137.43 215 131 216 125.13 216a61.1 61.1 0 0 1-15.13-2 8 8 0 1 1 4.3-15.41c4.38 1.2 14.95 2.7 19.55-.36.88-.59 1.83-1.52 2.14-3.93.35-2.67-.71-4.1-12.78-7.59-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9 2.31 1.49 6.45 2.68 10.45 3.84 9.79 2.83 26.35 7.66 24.11 24.97M215.42 155l-19.89 55.68a8 8 0 0 1-15.06 0L160.58 155a8.21 8.21 0 0 1 4.5-10.45 8 8 0 0 1 10.45 4.76l12.47 34.9 12.47-34.9a8 8 0 0 1 10.45-4.76 8.23 8.23 0 0 1 4.5 10.45" }) });
};
forwardRef(SvgFileCsv);
const SvgFileError = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m26.708 10.293-7-7A1 1 0 0 0 19 3H7a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V11a1 1 0 0 0-.293-.707m-7 11a1 1 0 0 1-1.415 1.415L16 20.414l-2.293 2.293a1 1 0 0 1-1.415-1.415L14.587 19l-2.293-2.293a1 1 0 1 1 1.415-1.415L16 17.587l2.293-2.293a1 1 0 0 1 1.415 1.415L17.414 19zM19 11V5.5l5.5 5.5z" }) });
};
forwardRef(SvgFileError);
const SvgFilePdf = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M6 15h20a1 1 0 0 0 1-1v-3a1 1 0 0 0-.293-.707l-7-7A1 1 0 0 0 19 3H7a2 2 0 0 0-2 2v9a1 1 0 0 0 1 1m13-9.5 5.5 5.5H19zM28 19a1 1 0 0 1-1 1h-3v2h2a1 1 0 0 1 0 2h-2v2a1 1 0 0 1-2 0v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1M8 18H6a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-1h1a3.5 3.5 0 1 0 0-7m0 5H7v-3h1a1.5 1.5 0 1 1 0 3m8-5h-2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2a4.5 4.5 0 1 0 0-9m0 7h-1v-5h1a2.5 2.5 0 0 1 0 5" }) });
};
forwardRef(SvgFilePdf);
const SvgFileXls = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M44 120h168a4 4 0 0 0 4-4V88a8 8 0 0 0-2.34-5.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v76a4 4 0 0 0 4 4m108-76 44 44h-44Zm4 164.53a8.18 8.18 0 0 1-8.25 7.47H120a8 8 0 0 1-8-8v-55.73a8.18 8.18 0 0 1 7.47-8.25 8 8 0 0 1 8.53 8v48h20a8 8 0 0 1 8 8.51m-61.49-51.88L77.83 180l16.68 23.35a8 8 0 0 1-13 9.3L68 193.76l-13.49 18.89a8 8 0 1 1-13-9.3L58.17 180l-16.68-23.35a8 8 0 0 1 2.3-11.46 8.19 8.19 0 0 1 10.88 2.38L68 166.24l13.49-18.89a8 8 0 0 1 13 9.3Zm121.28 39.66a20.81 20.81 0 0 1-9.18 15.23c-5.19 3.46-11.67 4.46-17.49 4.46a60.6 60.6 0 0 1-15.19-2 8 8 0 0 1 4.31-15.41c4.38 1.21 14.94 2.71 19.54-.35.89-.6 1.84-1.52 2.15-3.93.34-2.67-.72-4.1-12.78-7.59-9.35-2.7-25-7.23-23-23.12a20.58 20.58 0 0 1 8.95-14.94c11.84-8 30.72-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.48-1.17-15.22-2.56-19.82.56a4.54 4.54 0 0 0-2 3.67c-.11.9-.13 1.08 1.12 1.9 2.31 1.49 6.45 2.68 10.45 3.84 9.87 2.82 26.39 7.65 24.18 24.96" }) });
};
forwardRef(SvgFileXls);
const SvgFileZip = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M184 144h-16a8 8 0 0 0-8 8v55.73a8.17 8.17 0 0 0 7.47 8.25 8 8 0 0 0 8.53-8v-8h7.4c15.24 0 28.14-11.92 28.59-27.15A28 28 0 0 0 184 144m-.35 40H176v-24h8a12 12 0 0 1 12 13.16A12.25 12.25 0 0 1 183.65 184M136 152v55.73a8.17 8.17 0 0 1-7.47 8.25 8 8 0 0 1-8.53-8v-55.71a8.17 8.17 0 0 1 7.47-8.25A8 8 0 0 1 136 152m-40 56.53a8.17 8.17 0 0 1-8.27 7.47h-31.5a8.27 8.27 0 0 1-6-2.5 8 8 0 0 1-1.18-9.5l25.16-44H56.27a8.17 8.17 0 0 1-8.27-7.47 8 8 0 0 1 8-8.53h31.77a8.27 8.27 0 0 1 6 2.5A8 8 0 0 1 95 156l-25.21 44H88a8 8 0 0 1 8 8.53M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v76a4 4 0 0 0 4 4h168a4 4 0 0 0 4-4V88a8 8 0 0 0-2.34-5.66M152 88V44l44 44Z" }) });
};
forwardRef(SvgFileZip);
const SvgFiles = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 16", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m13.687 4.146-2.5-2.5a.5.5 0 0 0-.354-.146h-5a1 1 0 0 0-1 1v1h-1a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1h1a1 1 0 0 0 1-1v-7a.5.5 0 0 0-.146-.354M8.833 12h-3a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1m0-2h-3a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1m4 1.5h-1v-5a.5.5 0 0 0-.146-.354l-2.5-2.5a.5.5 0 0 0-.354-.146h-3v-1h4.793l2.207 2.207z" }) });
};
forwardRef(SvgFiles);
const SvgFilter = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M25.5 16a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 1 1 0-3h16a1.5 1.5 0 0 1 1.5 1.5M29 8.5H3a1.5 1.5 0 0 0 0 3h26a1.5 1.5 0 1 0 0-3m-10 12h-6a1.5 1.5 0 1 0 0 3h6a1.5 1.5 0 1 0 0-3" }) });
};
forwardRef(SvgFilter);
const SvgFolder = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 9H16.414L13 5.586A1.98 1.98 0 0 0 11.586 5H5a2 2 0 0 0-2 2v18.078A1.926 1.926 0 0 0 4.924 27H27.11A1.89 1.89 0 0 0 29 25.111V11a2 2 0 0 0-2-2M5 7h6.586l2 2H5z" }) });
};
forwardRef(SvgFolder);
const SvgGift = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 9h-4.385q.075-.06.146-.125A3.7 3.7 0 0 0 24 6.196 4.08 4.08 0 0 0 19.805 2a3.7 3.7 0 0 0-2.68 1.239A6.9 6.9 0 0 0 16 5.049a6.9 6.9 0 0 0-1.125-1.81A3.7 3.7 0 0 0 12.195 2 4.08 4.08 0 0 0 8 6.196a3.7 3.7 0 0 0 1.239 2.679q.072.06.146.125H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2v8a2 2 0 0 0 2 2h7.5a.5.5 0 0 0 .5-.5V15H5v-4h10v4h2v-4h10v4H17v11.5a.5.5 0 0 0 .5.5H25a2 2 0 0 0 2-2v-8a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2M10.564 7.375A1.7 1.7 0 0 1 10 6.125 2.076 2.076 0 0 1 12.074 4h.061a1.71 1.71 0 0 1 1.25.563c1.049 1.185 1.419 3.15 1.549 4.365-1.22-.13-3.184-.5-4.37-1.553m10.875 0c-1.186 1.05-3.155 1.42-4.375 1.55.148-1.314.561-3.237 1.561-4.361A1.7 1.7 0 0 1 19.875 4h.061A2.077 2.077 0 0 1 22 6.135a1.7 1.7 0 0 1-.564 1.24z" }) });
};
forwardRef(SvgGift);
const SvgGlobe = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m9.796 8h-4.428a17.8 17.8 0 0 0-2.533-5.625A11.05 11.05 0 0 1 25.796 11M16 5.014c1.5 1.625 2.625 3.693 3.296 5.986h-6.592C13.375 8.707 14.5 6.641 16 5.014M12 16c0-1.005.084-2.009.25-3h7.5a18.2 18.2 0 0 1 0 6h-7.5a18 18 0 0 1-.25-3m.704 5h6.592c-.671 2.293-1.796 4.359-3.296 5.986-1.5-1.627-2.625-3.693-3.296-5.986m6.131 5.625A17.8 17.8 0 0 0 21.367 21h4.43a11.05 11.05 0 0 1-6.962 5.625M21.776 19a20.2 20.2 0 0 0 0-6h4.808a11 11 0 0 1 0 6z" }) });
};
forwardRef(SvgGlobe);
const SvgGraph = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 16", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M13 9.5c-.357 0-.71.085-1.028.25l-1.337-1.04a2.2 2.2 0 0 0 .116-.67l.646-.214a2.25 2.25 0 1 0-.636-1.37l-.487.162A2.25 2.25 0 0 0 8.5 5.75c-.062 0-.117 0-.175.008l-.278-.625A2.25 2.25 0 1 0 6.5 5.75c.063 0 .118 0 .176-.008l.278.625a2.24 2.24 0 0 0-.537 2.482l-1.33 1.182a2.25 2.25 0 1 0 .997 1.12l1.33-1.182a2.25 2.25 0 0 0 2.3-.075l1.224.954A2.25 2.25 0 1 0 13.001 9.5m0-4A.75.75 0 1 1 13 7a.75.75 0 0 1 0-1.5m-7.25-2a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0M4 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5M7.75 8a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0M13 12.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5" }) });
};
forwardRef(SvgGraph);
const SvgGraphQl = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M13.29 28.226 6.765 24.46a2.822 2.822 0 1 1-2.708-4.693v-7.532a2.824 2.824 0 1 1 2.708-4.693l6.525-3.767a2.824 2.824 0 1 1 5.42 0l6.524 3.766a2.822 2.822 0 1 1 2.71 4.693v7.533a2.824 2.824 0 1 1-2.71 4.694l-6.524 3.766A2.825 2.825 0 0 1 16 31.84a2.822 2.822 0 0 1-2.71-3.614M16 5.806q.413-.002.791-.113l8.531 14.776a2.8 2.8 0 0 0-.791 1.37H7.467a2.8 2.8 0 0 0-.79-1.369L15.21 5.693q.377.11.791.112M7.468 23.178l-.033.12 6.526 3.767A2.81 2.81 0 0 1 16 26.195c.802 0 1.526.334 2.04.871l6.523-3.766-.032-.121zM5.397 12.233a2.824 2.824 0 0 0 2.038-3.532l6.526-3.767q.043.045.088.088L5.517 19.8l-.12-.032zM26.482 19.8q.06-.018.121-.033v-7.532a2.824 2.824 0 0 1-2.04-3.534L18.04 4.934q-.045.045-.089.088z", clipRule: "evenodd" }) });
};
forwardRef(SvgGraphQl);
const SvgGridFour = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 7v7.5a.5.5 0 0 1-.5.5H17V5.5a.5.5 0 0 1 .5-.5H25a2 2 0 0 1 2 2M14.5 5H7a2 2 0 0 0-2 2v7.5a.5.5 0 0 0 .5.5H15V5.5a.5.5 0 0 0-.5-.5m12 12H17v9.5a.5.5 0 0 0 .5.5H25a2 2 0 0 0 2-2v-7.5a.5.5 0 0 0-.5-.5M5 17.5V25a2 2 0 0 0 2 2h7.5a.5.5 0 0 0 .5-.5V17H5.5a.5.5 0 0 0-.5.5" }) });
};
forwardRef(SvgGridFour);
const SvgGridNine = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M10.5 6.5v5h-7A.5.5 0 0 1 3 11V8a2 2 0 0 1 2-2h5a.5.5 0 0 1 .5.5m2 19a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-5h-7zM3 21v3a2 2 0 0 0 2 2h5a.5.5 0 0 0 .5-.5v-5h-7a.5.5 0 0 0-.5.5m0-7v4a.5.5 0 0 0 .5.5h7v-5h-7a.5.5 0 0 0-.5.5m16-8h-6a.5.5 0 0 0-.5.5v5h7v-5A.5.5 0 0 0 19 6m9.5 7.5h-7v5h7a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5m-16 5h7v-5h-7zM27 6h-5a.5.5 0 0 0-.5.5v5h7a.5.5 0 0 0 .5-.5V8a2 2 0 0 0-2-2m1.5 14.5h-7v5a.5.5 0 0 0 .5.5h5a2 2 0 0 0 2-2v-3a.5.5 0 0 0-.5-.5" }) });
};
forwardRef(SvgGridNine);
const SvgHandHeart = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.791 17.633a3.04 3.04 0 0 0-2.326-.597C28.813 14.666 30 12.31 30 10c0-3.309-2.661-6-5.933-6A5.95 5.95 0 0 0 19.5 6.094 5.95 5.95 0 0 0 14.932 4C11.663 4 9 6.691 9 10c0 1.375.405 2.711 1.258 4.125a4 4 0 0 0-1.844 1.05L5.586 18H2a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h13q.123 0 .242-.03l8-2a1 1 0 0 0 .15-.05l4.858-2.067.055-.025a3.074 3.074 0 0 0 .491-5.195zm-1.362 3.393-4.75 2.023L14.875 25H7v-5.586l2.829-2.828A1.98 1.98 0 0 1 11.242 16H17.5a1.5 1.5 0 0 1 0 3H14a1 1 0 0 0 0 2h4q.113 0 .224-.025l8.375-1.926.038-.01a1.075 1.075 0 0 1 .788 1.987z" }) });
};
forwardRef(SvgHandHeart);
const SvgHashtag = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 10.5h-5.475l.951-5.231a1.5 1.5 0 1 0-2.952-.538L19.475 10.5h-4.95l.951-5.231a1.5 1.5 0 1 0-2.952-.538L11.475 10.5H6a1.5 1.5 0 0 0 0 3h4.93l-.909 5H4a1.5 1.5 0 0 0 0 3h5.475l-.951 5.231a1.5 1.5 0 0 0 1.207 1.75q.134.022.269.019a1.5 1.5 0 0 0 1.475-1.233l1.05-5.767h4.95l-.951 5.231a1.5 1.5 0 1 0 2.952.543l1.049-5.774H26a1.5 1.5 0 1 0 0-3h-4.93l.909-5H28a1.5 1.5 0 1 0 0-3m-9.979 8H13.07l.909-5h4.951z" }) });
};
forwardRef(SvgHashtag);
const SvgHeadingFive = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M31.5 22.5a5 5 0 0 1-5 5 4.94 4.94 0 0 1-3.571-1.45 1.5 1.5 0 0 1 2.142-2.1 1.94 1.94 0 0 0 1.429.55 2 2 0 0 0 0-4 1.94 1.94 0 0 0-1.429.55 1.5 1.5 0 0 1-2.551-1.3l1-6A1.5 1.5 0 0 1 25 12.5h5a1.5 1.5 0 1 1 0 3h-3.729l-.338 2.029q.283-.03.567-.029a5 5 0 0 1 5 5M18 5.5A1.5 1.5 0 0 0 16.5 7v6h-10V7a1.5 1.5 0 0 0-3 0v15a1.5 1.5 0 0 0 3 0v-6h10v6a1.5 1.5 0 1 0 3 0V7A1.5 1.5 0 0 0 18 5.5" }) });
};
forwardRef(SvgHeadingFive);
const SvgHeadingFour = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M32 22a1.5 1.5 0 0 1-1.5 1.5V26a1.5 1.5 0 1 1-3 0v-2.5H23a1.5 1.5 0 0 1-1.422-1.974l3-9a1.5 1.5 0 0 1 2.845.948L25.08 20.5H27.5V18a1.5 1.5 0 1 1 3 0v2.5A1.5 1.5 0 0 1 32 22M18 5.5A1.5 1.5 0 0 0 16.5 7v6h-10V7a1.5 1.5 0 0 0-3 0v15a1.5 1.5 0 0 0 3 0v-6h10v6a1.5 1.5 0 1 0 3 0V7A1.5 1.5 0 0 0 18 5.5" }) });
};
forwardRef(SvgHeadingFour);
const SvgHeadingOne = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29.5 14v12a1.5 1.5 0 1 1-3 0v-9.198l-.668.448a1.503 1.503 0 0 1-1.665-2.5l3-2A1.5 1.5 0 0 1 29.5 14M18 5.5A1.5 1.5 0 0 0 16.5 7v6h-10V7a1.5 1.5 0 0 0-3 0v15a1.5 1.5 0 0 0 3 0v-6h10v6a1.5 1.5 0 1 0 3 0V7A1.5 1.5 0 0 0 18 5.5" }) });
};
forwardRef(SvgHeadingOne);
const SvgHeadingSix = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m27.133 17.541 1.655-2.772a1.5 1.5 0 1 0-2.576-1.538l-4.03 6.75q-.018.029-.032.059a5 5 0 1 0 4.983-2.5zM26.5 24.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4M19.5 7v15a1.5 1.5 0 1 1-3 0v-6h-10v6a1.5 1.5 0 0 1-3 0V7a1.5 1.5 0 0 1 3 0v6h10V7a1.5 1.5 0 1 1 3 0" }) });
};
forwardRef(SvgHeadingSix);
const SvgHeadingThree = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M31.5 22.5a5 5 0 0 1-8.571 3.5 1.5 1.5 0 1 1 2.142-2.099A2 2 0 1 0 26.5 20.5a1.5 1.5 0 0 1-1.229-2.36l1.854-2.64H24a1.5 1.5 0 1 1 0-3h6a1.5 1.5 0 0 1 1.229 2.36l-2.293 3.275A5 5 0 0 1 31.5 22.5M18 5.5A1.5 1.5 0 0 0 16.5 7v6h-10V7a1.5 1.5 0 0 0-3 0v15a1.5 1.5 0 0 0 3 0v-6h10v6a1.5 1.5 0 1 0 3 0V7A1.5 1.5 0 0 0 18 5.5" }) });
};
forwardRef(SvgHeadingThree);
const SvgHeadingTwo = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M19.5 7v15a1.5 1.5 0 1 1-3 0v-6h-10v6a1.5 1.5 0 0 1-3 0V7a1.5 1.5 0 0 1 3 0v6h10V7a1.5 1.5 0 1 1 3 0M30 24.5h-3l3.593-4.791a4.499 4.499 0 1 0-7.837-4.209 1.5 1.5 0 1 0 2.829 1q.076-.218.216-.402a1.5 1.5 0 1 1 2.394 1.807L22.8 25.1a1.5 1.5 0 0 0 1.2 2.4h6a1.5 1.5 0 1 0 0-3" }) });
};
forwardRef(SvgHeadingTwo);
const SvgHeadphones = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29 17v7a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3h2.956A10.964 10.964 0 0 0 16.081 6H16A11 11 0 0 0 5.045 16H8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a13.014 13.014 0 0 1 22.236-9.167A12.93 12.93 0 0 1 29 17" }) });
};
forwardRef(SvgHeadphones);
const SvgHeart = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30 11.75c0 8.75-12.974 15.833-13.526 16.125a1 1 0 0 1-.948 0C14.974 27.582 2 20.5 2 11.75A7.76 7.76 0 0 1 9.75 4c2.581 0 4.841 1.11 6.25 2.986C17.409 5.11 19.669 4 22.25 4A7.76 7.76 0 0 1 30 11.75" }) });
};
forwardRef(SvgHeart);
const SvgHouse = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 14.444V26a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14.444a2 2 0 0 1 .646-1.473l10-9.435.014-.013a2 2 0 0 1 2.705.013l10 9.435A2 2 0 0 1 28 14.444" }) });
};
forwardRef(SvgHouse);
const SvgImage = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 5H5a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-7.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3M5 25v-3.5l6.5-6.5 10 10zm22 0h-2.671l-4.5-4.5 2.5-2.5L27 22.672z" }) });
};
forwardRef(SvgImage);
const SvgImages = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 5H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3M23 25H5V11h2v10a2 2 0 0 0 2 2h14zm4-4H9v-4.5l4.5-4.5 6.208 6.208a1 1 0 0 0 1.413 0L24.33 15 27 17.672z" }) });
};
forwardRef(SvgImages);
const SvgIndentDecrease = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5H15a1.5 1.5 0 0 1 0-3h12a1.5 1.5 0 0 1 1.5 1.5M15 9.5h12a1.5 1.5 0 0 0 0-3H15a1.5 1.5 0 0 0 0 3m12 13H5a1.5 1.5 0 1 0 0 3h22a1.5 1.5 0 0 0 0-3m-18-4a1.5 1.5 0 0 0 1.061-2.561L6.125 12l3.936-3.94a1.503 1.503 0 1 0-2.125-2.125l-5 5a1.5 1.5 0 0 0 0 2.125l5 5A1.5 1.5 0 0 0 9 18.5" }) });
};
forwardRef(SvgIndentDecrease);
const SvgIndentIncrease = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5H15a1.5 1.5 0 0 1 0-3h12a1.5 1.5 0 0 1 1.5 1.5M15 9.5h12a1.5 1.5 0 0 0 0-3H15a1.5 1.5 0 0 0 0 3m12 13H5a1.5 1.5 0 0 0 0 3h22a1.5 1.5 0 1 0 0-3M3.939 18.06a1.5 1.5 0 0 0 2.125 0l5-5a1.5 1.5 0 0 0 0-2.125l-5-5a1.503 1.503 0 0 0-2.125 2.125L7.875 12l-3.936 3.939a1.5 1.5 0 0 0 0 2.122" }) });
};
forwardRef(SvgIndentIncrease);
const SvgInformation = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m-.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3M17 23a2 2 0 0 1-2-2v-5a1 1 0 0 1 0-2 2 2 0 0 1 2 2v5a1 1 0 0 1 0 2" }) });
};
forwardRef(SvgInformation);
const SvgItalic = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M25.5 7A1.5 1.5 0 0 1 24 8.5h-3.919l-5 15H18a1.5 1.5 0 1 1 0 3H8a1.5 1.5 0 1 1 0-3h3.919l5-15H14a1.5 1.5 0 0 1 0-3h10A1.5 1.5 0 0 1 25.5 7" }) });
};
forwardRef(SvgItalic);
const SvgKey = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M20 2a10.01 10.01 0 0 0-9.511 13.098l-7.196 7.195A1 1 0 0 0 3 23v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-2h2a1 1 0 0 0 1-1v-2h2a1 1 0 0 0 .707-.293l1.195-1.196A10 10 0 1 0 20 2m2.5 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4" }) });
};
forwardRef(SvgKey);
const SvgLayout = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 5H5a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M5 7h22v5H5zm22 18H14V14h13z" }) });
};
forwardRef(SvgLayout);
const SvgLightbulb = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M22 29a1 1 0 0 1-1 1H11a1 1 0 1 1 0-2h10a1 1 0 0 1 1 1m5-16a10.94 10.94 0 0 1-4.205 8.651A2.03 2.03 0 0 0 22 23.25V24a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-.75a2 2 0 0 0-.779-1.582A10.95 10.95 0 0 1 5 13.06C4.967 7.104 9.782 2.143 15.735 2A11 11 0 0 1 27 13m-4.014-1.168a7.2 7.2 0 0 0-5.82-5.818 1 1 0 1 0-.332 1.972c2.071.349 3.829 2.106 4.18 4.182a1 1 0 0 0 1.972-.335" }) });
};
forwardRef(SvgLightbulb);
const SvgLightning = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m21.731 14.683-14 15a1 1 0 0 1-1.711-.875l1.832-9.167L.65 16.936a1 1 0 0 1-.375-1.625l14-15a1 1 0 0 1 1.71.875l-1.837 9.177 7.204 2.7a1 1 0 0 1 .375 1.62z" }) });
};
const ForwardRef$1g = forwardRef(SvgLightning);
const SvgLink = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M17.046 23.441a1.5 1.5 0 0 1 0 2.125l-.742.743a7.502 7.502 0 1 1-10.61-10.61l3.015-3.014A7.5 7.5 0 0 1 19 12.375a1.506 1.506 0 0 1-2 2.25 4.5 4.5 0 0 0-6.171.184l-3.013 3.01a4.5 4.5 0 0 0 6.365 6.365l.743-.743a1.5 1.5 0 0 1 2.122 0m9.26-17.75a7.51 7.51 0 0 0-10.61 0l-.742.743a1.503 1.503 0 1 0 2.125 2.125l.742-.743a4.5 4.5 0 0 1 6.365 6.365l-3.014 3.015a4.5 4.5 0 0 1-6.172.179 1.506 1.506 0 1 0-2 2.25 7.5 7.5 0 0 0 10.288-.304l3.014-3.014a7.51 7.51 0 0 0 .004-10.613z" }) });
};
forwardRef(SvgLink);
const SvgList = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 1 1 0-3h22a1.5 1.5 0 0 1 1.5 1.5M5 9.5h22a1.5 1.5 0 0 0 0-3H5a1.5 1.5 0 0 0 0 3m22 13H5a1.5 1.5 0 1 0 0 3h22a1.5 1.5 0 1 0 0-3" }) });
};
forwardRef(SvgList);
const SvgListPlus = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M3.5 8A1.5 1.5 0 0 1 5 6.5h22a1.5 1.5 0 0 1 0 3H5A1.5 1.5 0 0 1 3.5 8M5 17.5h22a1.5 1.5 0 1 0 0-3H5a1.5 1.5 0 1 0 0 3m13 5H5a1.5 1.5 0 1 0 0 3h13a1.5 1.5 0 1 0 0-3m11 0h-1.5V21a1.5 1.5 0 1 0-3 0v1.5H23a1.5 1.5 0 1 0 0 3h1.5V27a1.5 1.5 0 1 0 3 0v-1.5H29a1.5 1.5 0 1 0 0-3" }) });
};
forwardRef(SvgListPlus);
const SvgListSearch = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 64a12 12 0 0 1 12-12h176a12 12 0 0 1 0 24H40a12 12 0 0 1-12-12m12 76h64a12 12 0 0 0 0-24H40a12 12 0 0 0 0 24m80 40H40a12 12 0 0 0 0 24h80a12 12 0 0 0 0-24m120.49 20.49a12 12 0 0 1-17 0l-18.08-18.08a44 44 0 1 1 17-17l18.08 18.07a12 12 0 0 1 0 17.01M184 164a20 20 0 1 0-20-20 20 20 0 0 0 20 20" }) });
};
forwardRef(SvgListSearch);
const SvgLoader = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M17.5 4v4a1.5 1.5 0 1 1-3 0V4a1.5 1.5 0 1 1 3 0m4.156 7.844a1.5 1.5 0 0 0 1.062-.44l2.828-2.829a1.503 1.503 0 1 0-2.125-2.125l-2.825 2.833a1.5 1.5 0 0 0 1.06 2.56M28 14.5h-4a1.5 1.5 0 1 0 0 3h4a1.5 1.5 0 1 0 0-3m-5.282 6.096a1.501 1.501 0 0 0-2.451 1.638c.075.182.186.348.326.487l2.828 2.829a1.503 1.503 0 0 0 2.125-2.125zM16 22.5a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 1 0 3 0v-4a1.5 1.5 0 0 0-1.5-1.5m-6.717-1.904-2.83 2.829A1.503 1.503 0 0 0 8.58 25.55l2.829-2.829a1.503 1.503 0 0 0-2.125-2.125M9.5 16A1.5 1.5 0 0 0 8 14.5H4a1.5 1.5 0 1 0 0 3h4A1.5 1.5 0 0 0 9.5 16m-.925-9.546A1.503 1.503 0 0 0 6.45 8.579l2.833 2.825a1.503 1.503 0 0 0 2.125-2.125z" }) });
};
const ForwardRef$1b = forwardRef(SvgLoader);
const SvgLock = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26 10h-4V7a6 6 0 1 0-12 0v3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2M16 20.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M20 10h-8V7a4 4 0 1 1 8 0z" }) });
};
forwardRef(SvgLock);
const SvgMagic = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M31 19a1 1 0 0 1-1 1h-2v2a1 1 0 0 1-2 0v-2h-2a1 1 0 0 1 0-2h2v-2a1 1 0 1 1 2 0v2h2a1 1 0 0 1 1 1M7 9h2v2a1 1 0 1 0 2 0V9h2a1 1 0 0 0 0-2h-2V5a1 1 0 0 0-2 0v2H7a1 1 0 0 0 0 2m16 15h-1v-1a1 1 0 0 0-2 0v1h-1a1 1 0 0 0 0 2h1v1a1 1 0 1 0 2 0v-1h1a1 1 0 0 0 0-2m4.414-14L10 27.414a2 2 0 0 1-2.828 0l-2.587-2.585a2 2 0 0 1 0-2.829L22 4.586a2 2 0 0 1 2.829 0l2.585 2.585a2 2 0 0 1 0 2.829M26 8.586 23.414 6l-4 4L22 12.586z" }) });
};
forwardRef(SvgMagic);
const SvgMail = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 6H4a1 1 0 0 0-1 1v17a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V7a1 1 0 0 0-1-1M12.339 16 5 22.726V9.274zm1.48 1.356 1.5 1.381a1 1 0 0 0 1.352 0l1.5-1.38L25.421 24H6.571zM19.66 16 27 9.273v13.455z" }) });
};
forwardRef(SvgMail);
const SvgManyToMany = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M11 7q0 .432-.088.838L16 10.382l5.088-2.544a4 4 0 1 1 .895 1.789L18.236 11.5l3.747 1.873a4 4 0 1 1 0 5.253L18.236 20.5l3.747 1.874a4 4 0 1 1-.895 1.788L16 21.618l-5.088 2.544Q11 24.567 11 25a4 4 0 1 1-.983-2.626l3.747-1.874-3.747-1.873a4 4 0 1 1 0-5.253l3.747-1.874-3.747-1.874A4 4 0 1 1 11 7M9 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m2.236 8h9.528L16 12.618zM9 25a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-2-7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M27 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-2 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4m2-11a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-11 3.382L20.764 17h-9.528z", clipRule: "evenodd" }) });
};
forwardRef(SvgManyToMany);
const SvgManyToOne = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M14.8 8.254a4 4 0 1 0-1.082 1.682l7.483 4.81a4 4 0 0 0-.075.254H10.874A4.002 4.002 0 0 0 3 16a4 4 0 0 0 7.874 1h10.252q.033.128.075.254l-7.484 4.81a4 4 0 1 0 1.082 1.682l7.484-4.81a4 4 0 1 0 0-5.871zM11 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4M9 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0m16 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4", clipRule: "evenodd" }) });
};
forwardRef(SvgManyToOne);
const SvgManyWays = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18.842 3.227a1 1 0 1 0-.445 1.95l1.747.399L9.6 12.959a4 4 0 1 0 0 6.081l10.546 7.385-1.748.399a1 1 0 1 0 .445 1.95l3.945-.9a1 1 0 0 0 .77-1.1l-.503-4.014a1 1 0 0 0-1.985.248l.223 1.779-10.545-7.384a4 4 0 0 0 .127-.403h14.712l-1.293 1.293a1 1 0 1 0 1.414 1.414l3-3a1 1 0 0 0 0-1.414l-3-3a1 1 0 0 0-1.414 1.414L25.586 15H10.874a4 4 0 0 0-.127-.403l10.544-7.383-.222 1.778a1 1 0 0 0 1.984.249l.503-4.015a1 1 0 0 0-.77-1.099zM9 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0", clipRule: "evenodd" }) });
};
forwardRef(SvgManyWays);
const SvgMessage = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 6H5a2 2 0 0 0-2 2v20a1.98 1.98 0 0 0 1.156 1.813 1.986 1.986 0 0 0 2.141-.299L10.312 26H27a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2M10.5 17.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
const ForwardRef$14 = forwardRef(SvgMessage);
const SvgMicrophone = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M10 16V8a6 6 0 1 1 12 0v8a6 6 0 1 1-12 0m16 0a1 1 0 0 0-2 0 8 8 0 0 1-16 0 1 1 0 1 0-2 0 10.014 10.014 0 0 0 9 9.95V29a1 1 0 0 0 2 0v-3.05A10.014 10.014 0 0 0 26 16" }) });
};
forwardRef(SvgMicrophone);
const SvgMinus = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 1 1 0-3h22a1.5 1.5 0 0 1 1.5 1.5" }) });
};
const ForwardRef$12 = forwardRef(SvgMinus);
const SvgMinusCircle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m5 14H11a1 1 0 0 1 0-2h10a1 1 0 0 1 0 2" }) });
};
forwardRef(SvgMinusCircle);
const SvgMonitor = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26 5H6a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3M20 27h-8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2" }) });
};
forwardRef(SvgMonitor);
const SvgMoon = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29.443 18.776a13.1 13.1 0 0 1-4.626 6.614A13 13 0 0 1 4 15a12.9 12.9 0 0 1 2.61-7.815 13.1 13.1 0 0 1 6.614-4.625 1 1 0 0 1 1.25 1.25 11.01 11.01 0 0 0 13.725 13.725 1 1 0 0 1 1.25 1.25z" }) });
};
forwardRef(SvgMoon);
const SvgMore = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M18 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0M7.5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4m17 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4" }) });
};
forwardRef(SvgMore);
const SvgMove = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M10.939 8.061a1.5 1.5 0 0 1 0-2.125l4-4a1.5 1.5 0 0 1 2.125 0l4 4a1.503 1.503 0 1 1-2.125 2.125L17.5 6.625V12a1.5 1.5 0 1 1-3 0V6.625l-1.439 1.436a1.5 1.5 0 0 1-2.122 0m8 15.875L17.5 25.375V20a1.5 1.5 0 1 0-3 0v5.375l-1.439-1.44a1.504 1.504 0 0 0-2.125 2.125l4 4a1.5 1.5 0 0 0 2.125 0l4-4a1.502 1.502 0 1 0-2.125-2.125zm11.125-9-4-4a1.503 1.503 0 0 0-2.125 2.125l1.436 1.439H20a1.5 1.5 0 0 0 0 3h5.375l-1.44 1.439a1.503 1.503 0 0 0 2.125 2.125l4-4a1.5 1.5 0 0 0 .001-2.125zM6.625 17.5H12a1.5 1.5 0 1 0 0-3H6.625l1.44-1.439a1.503 1.503 0 1 0-2.125-2.125l-4 4a1.5 1.5 0 0 0 0 2.125l4 4a1.503 1.503 0 0 0 2.125-2.125z" }) });
};
forwardRef(SvgMove);
const SvgMusicNotes = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26.615 3.214a.99.99 0 0 0-.857-.183l-16 4a1 1 0 0 0-.758.97v13.762a4.5 4.5 0 1 0 2 3.737V13.781l14-3.5v7.482a4.5 4.5 0 1 0 2 3.737V4a1 1 0 0 0-.385-.786" }) });
};
forwardRef(SvgMusicNotes);
const SvgNumberList = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5H14.5a1.5 1.5 0 1 1 0-3H27a1.5 1.5 0 0 1 1.5 1.5m-14-6.5H27a1.5 1.5 0 0 0 0-3H14.5a1.5 1.5 0 0 0 0 3m12.5 13H14.5a1.5 1.5 0 1 0 0 3H27a1.5 1.5 0 1 0 0-3M5.5 7.414V13a1.5 1.5 0 0 0 3 0V5a1.5 1.5 0 0 0-2.17-1.341l-2 1a1.5 1.5 0 0 0 1.17 2.75zm4.966 12.107a3.46 3.46 0 0 0-1.4-2.329 3.61 3.61 0 0 0-4.954.683 3.5 3.5 0 0 0-.52.942 1.5 1.5 0 0 0 2.818 1.027.5.5 0 0 1 .072-.125.6.6 0 0 1 .813-.103.48.48 0 0 1 .201.325.45.45 0 0 1-.096.347l-.016.02-3.585 4.794A1.5 1.5 0 0 0 5 27.5h4a1.5 1.5 0 1 0 0-3H8l1.785-2.389a3.43 3.43 0 0 0 .681-2.59" }) });
};
forwardRef(SvgNumberList);
const SvgOneToMany = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M17.2 8.254a4 4 0 1 1 1.082 1.682l-7.482 4.81q.04.125.074.254h10.252A4.002 4.002 0 0 1 29 16a4 4 0 0 1-7.874 1H10.874q-.033.128-.075.254l7.484 4.81a4 4 0 1 1-1.082 1.682l-7.484-4.81a4 4 0 1 1 0-5.871zM21 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4m2-11a2 2 0 1 0 4 0 2 2 0 0 0-4 0M7 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4", clipRule: "evenodd" }) });
};
forwardRef(SvgOneToMany);
const SvgOneToOne = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10.874 17A4.002 4.002 0 0 1 3 16a4 4 0 0 1 7.874-1h10.252A4.002 4.002 0 0 1 29 16a4 4 0 0 1-7.874 1zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4m18 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4", clipRule: "evenodd" }) });
};
forwardRef(SvgOneToOne);
const SvgOneWay = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M28.924 16.384c-.05.12-.124.231-.217.324l-4 4a1 1 0 0 1-1.632-.324 1 1 0 0 1 .217-1.09L25.585 17H10.875A4.002 4.002 0 0 1 3 16a4 4 0 0 1 7.874-1h14.712l-2.294-2.293a1 1 0 0 1 1.415-1.415l4 4a1 1 0 0 1 .217 1.09M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4", clipRule: "evenodd" }) });
};
forwardRef(SvgOneWay);
const SvgPaintBrush = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29 4a1 1 0 0 0-1-1c-5.51 0-11.164 6.214-14.304 10.329A7.5 7.5 0 0 0 4 20.5c0 3.86-2.443 5.591-2.559 5.671A1 1 0 0 0 2 28h9.5a7.5 7.5 0 0 0 7.171-9.696C22.788 15.164 29 9.51 29 4M15.553 14.194a48 48 0 0 1 1.26-1.569 9.5 9.5 0 0 1 2.562 2.561q-.738.618-1.569 1.262a7.6 7.6 0 0 0-2.254-2.254m5.337-.335a11.6 11.6 0 0 0-2.75-2.75c3.973-4.316 6.969-5.625 8.738-5.989-.357 1.77-1.672 4.766-5.988 8.739" }) });
};
forwardRef(SvgPaintBrush);
const SvgPaintRoller = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M31 13v6.25a2.01 2.01 0 0 1-1.45 1.922L17 24.75V29a1 1 0 0 1-2 0v-4.25a2.01 2.01 0 0 1 1.45-1.922L29 19.25V13h-2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3H2a1 1 0 0 1 0-2h2V8a2 2 0 0 1 2-2h19a2 2 0 0 1 2 2v3h2a2 2 0 0 1 2 2" }) });
};
forwardRef(SvgPaintRoller);
const SvgPalette = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M25.096 6.736A12.9 12.9 0 0 0 16 3h-.134A13 13 0 0 0 3 16c0 5.375 3.323 9.883 8.67 11.771A4 4 0 0 0 17 24a2 2 0 0 1 2-2h5.776a3.976 3.976 0 0 0 3.9-3.11c.224-.984.332-1.99.324-3a12.9 12.9 0 0 0-3.904-9.154M10.5 21a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m0-7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5.5-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
forwardRef(SvgPalette);
const SvgPaperPlane = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.925 5.543v.018L21.65 29.554A1.985 1.985 0 0 1 19.728 31a1.98 1.98 0 0 1-1.803-1.144l-4.464-9.423a.5.5 0 0 1 .099-.568l7.158-7.159a1 1 0 0 0-1.414-1.413l-7.169 7.157a.5.5 0 0 1-.567.099l-9.376-4.441A2.05 2.05 0 0 1 1 12.17a1.99 1.99 0 0 1 1.446-1.815L26.44 3.08h.018a2 2 0 0 1 2.468 2.463" }) });
};
forwardRef(SvgPaperPlane);
const SvgPaperclip = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m26.56 17.061-10.257 10.25a7.501 7.501 0 0 1-10.607-10.61l12.27-12.236a5 5 0 0 1 7.07 7.074l-.021.02L13.04 23.086a1.503 1.503 0 0 1-2.121-.041 1.5 1.5 0 0 1 .041-2.121L22.924 9.409a2 2 0 1 0-2.838-2.82L7.816 18.82a4.5 4.5 0 1 0 6.366 6.364l10.258-10.25a1.503 1.503 0 0 1 2.125 2.125z" }) });
};
forwardRef(SvgPaperclip);
const SvgParagraph = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M3.5 8A1.5 1.5 0 0 1 5 6.5h22a1.5 1.5 0 0 1 0 3H5A1.5 1.5 0 0 1 3.5 8M5 14.5h16a1.5 1.5 0 1 0 0-3H5a1.5 1.5 0 1 0 0 3m22 2H5a1.5 1.5 0 1 0 0 3h22a1.5 1.5 0 1 0 0-3m-6 5H5a1.5 1.5 0 1 0 0 3h16a1.5 1.5 0 1 0 0-3" }) });
};
forwardRef(SvgParagraph);
const SvgPencil = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m28.414 9.171-5.585-5.586a2 2 0 0 0-2.829 0L4.586 19A1.98 1.98 0 0 0 4 20.414V26a2 2 0 0 0 2 2h5.586A1.98 1.98 0 0 0 13 27.414L28.414 12a2 2 0 0 0 0-2.829M24 13.585 18.414 8l3-3L27 10.585z" }) });
};
forwardRef(SvgPencil);
const SvgPhone = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.985 21.885A7.03 7.03 0 0 1 22 28c-9.925 0-18-8.075-18-18a7.03 7.03 0 0 1 6.115-6.985 2 2 0 0 1 2.078 1.19l2.64 5.894v.015a2 2 0 0 1-.16 1.886 1 1 0 0 1-.07.096L12 15.181c.936 1.903 2.926 3.875 4.854 4.814l3.042-2.589q.045-.037.094-.07a2 2 0 0 1 1.896-.175l.017.008 5.888 2.639a2 2 0 0 1 1.194 2.077" }) });
};
forwardRef(SvgPhone);
const SvgPin = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m29.416 13-6.683 6.706c.57 1.584.806 4.236-1.65 7.5a2 2 0 0 1-1.458.794h-.141a2 2 0 0 1-1.415-.586l-6.033-6.04-5.328 5.333a1 1 0 1 1-1.415-1.415l5.332-5.328-6.037-6.038a2 2 0 0 1 .162-2.972c3.178-2.564 6.219-2.06 7.55-1.643L19 2.587a2 2 0 0 1 2.829 0l7.586 7.585A2 2 0 0 1 29.416 13" }) });
};
forwardRef(SvgPin);
const SvgPinMap = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 2A11.013 11.013 0 0 0 5 13c0 9.413 10 16.521 10.426 16.819a1 1 0 0 0 1.148 0C17 29.52 27 22.413 27 13A11.01 11.01 0 0 0 16 2m0 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8" }) });
};
forwardRef(SvgPinMap);
const SvgPlane = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30 17v4a1 1 0 0 1-1.196.98L19.5 20.125v2.966l2.207 2.206A1 1 0 0 1 22 26v3a1 1 0 0 1-1.375.929L16 28.078l-4.625 1.85A1 1 0 0 1 10 29v-3a1 1 0 0 1 .293-.707l2.207-2.207v-2.961L3.196 21.98A1 1 0 0 1 2 21v-4a1 1 0 0 1 .553-.895l9.947-4.972V5.5a3.5 3.5 0 1 1 7 0v5.633l9.948 4.972A1 1 0 0 1 30 17" }) });
};
forwardRef(SvgPlane);
const SvgPlant = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M25.676 18.884a7.6 7.6 0 0 1-3.978 1.107 9 9 0 0 1-3.42-.707A6.94 6.94 0 0 0 17 23.314V27a1 1 0 0 1-1.066 1A1.023 1.023 0 0 1 15 26.969v-1.555l-4.828-4.828A6.6 6.6 0 0 1 7.93 21a5.73 5.73 0 0 1-2.99-.834C2.216 18.511.75 14.702 1.034 9.974a1 1 0 0 1 .94-.94c4.728-.28 8.537 1.182 10.187 3.906a5.75 5.75 0 0 1 .806 3.56.5.5 0 0 1-.86.304l-2.4-2.513a1 1 0 0 0-1.415 1.414l6.736 6.906q.01-.146.026-.291a8.57 8.57 0 0 1 2.33-4.933l6.323-6.682a1 1 0 0 0-1.413-1.415l-6.125 6.477a.5.5 0 0 1-.848-.217c-.592-2.185-.331-4.36.8-6.228 2.233-3.685 7.428-5.657 13.898-5.277a1 1 0 0 1 .94.94c.375 6.471-1.598 11.666-5.283 13.899" }) });
};
forwardRef(SvgPlant);
const SvgPlay = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30 16a1.97 1.97 0 0 1-.95 1.689L11.04 28.706a2 2 0 0 1-2.767-.688A2 2 0 0 1 8 27.016V4.984a1.98 1.98 0 0 1 1.015-1.728 2 2 0 0 1 2.025.038L29.05 14.31A1.97 1.97 0 0 1 30 16" }) });
};
forwardRef(SvgPlay);
const SvgPlus = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5h-9.5V27a1.5 1.5 0 1 1-3 0v-9.5H5a1.5 1.5 0 1 1 0-3h9.5V5a1.5 1.5 0 1 1 3 0v9.5H27a1.5 1.5 0 0 1 1.5 1.5" }) });
};
forwardRef(SvgPlus);
const SvgPlusCircle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.016 13.016 0 0 0 16 3m5 14h-4v4a1 1 0 0 1-2 0v-4h-4a1 1 0 0 1 0-2h4v-4a1 1 0 0 1 2 0v4h4a1 1 0 0 1 0 2" }) });
};
forwardRef(SvgPlusCircle);
const SvgPresentationChart = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 5H17V3a1 1 0 0 0-2 0v2H5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h4.92l-2.701 3.375a1 1 0 0 0 1.562 1.25L12.48 24h7.04l3.699 4.625a1 1 0 1 0 1.562-1.25L22.08 24H27a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M13 18a1 1 0 0 1-2 0v-3a1 1 0 0 1 2 0zm4 0a1 1 0 0 1-2 0v-5a1 1 0 0 1 2 0zm4 0a1 1 0 0 1-2 0v-7a1 1 0 0 1 2 0z" }) });
};
forwardRef(SvgPresentationChart);
const SvgPriceTag = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M30.414 17 18 4.586A1.98 1.98 0 0 0 16.586 4H5a1 1 0 0 0-1 1v11.586A1.98 1.98 0 0 0 4.586 18L17 30.414a2 2 0 0 0 2.829 0l10.585-10.585a2 2 0 0 0 0-2.829M10.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
forwardRef(SvgPriceTag);
const SvgPuzzlePiece = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M20.723 28H26a2 2 0 0 0 2-2v-4.706a1 1 0 0 0-1.383-.919 2.9 2.9 0 0 1-1.117.221c-1.654 0-3-1.387-3-3.091s1.346-3.091 3-3.091c.383 0 .763.075 1.117.221A1 1 0 0 0 28 13.706V9a2 2 0 0 0-2-2h-4.527a4.5 4.5 0 1 0-8.945 0H8a2 2 0 0 0-2 2v4.028a4.5 4.5 0 1 0 0 8.945V26a2 2 0 0 0 2 2h5.278" }) });
};
forwardRef(SvgPuzzlePiece);
const SvgQuestion = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M18 22.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0M29.5 16A13.5 13.5 0 1 1 16 2.5 13.515 13.515 0 0 1 29.5 16m-3 0A10.5 10.5 0 1 0 16 26.5 10.51 10.51 0 0 0 26.5 16M16 8c-3.033 0-5.5 2.242-5.5 5v.5a1.5 1.5 0 1 0 3 0V13c0-1.102 1.125-2 2.5-2s2.5.898 2.5 2-1.125 2-2.5 2a1.5 1.5 0 0 0-1.5 1.5v1a1.5 1.5 0 0 0 2.966.32C19.79 17.235 21.5 15.296 21.5 13c0-2.758-2.468-5-5.5-5" }) });
};
forwardRef(SvgQuestion);
const SvgQuotes = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M14.5 9v11a6.006 6.006 0 0 1-6 6 1 1 0 0 1 0-2 4 4 0 0 0 4-4v-1H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h7.5a2 2 0 0 1 2 2M27 7h-7.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2H27v1a4 4 0 0 1-4 4 1 1 0 0 0 0 2 6.006 6.006 0 0 0 6-6V9a2 2 0 0 0-2-2" }) });
};
forwardRef(SvgQuotes);
const SvgRestaurant = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 5v23a1 1 0 0 1-2 0v-6h-6a1 1 0 0 1-1-1c.046-2.395.349-4.779.902-7.11 1.223-5.061 3.54-8.454 6.704-9.809a1 1 0 0 1 1.394.92m-12.014-.164a.999.999 0 1 0-1.972.33L13.986 11H11V5a1 1 0 0 0-2 0v6H6.014l.972-5.835a1 1 0 1 0-1.972-.329l-1 6A1 1 0 0 0 4 11a6.01 6.01 0 0 0 5 5.915V28a1 1 0 1 0 2 0V16.915A6.01 6.01 0 0 0 16 11q0-.083-.014-.164z" }) });
};
forwardRef(SvgRestaurant);
const SvgRocket = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M19 28a1 1 0 0 1-1 1h-4a1 1 0 0 1 0-2h4a1 1 0 0 1 1 1m8.953-8.521-1.546 6.954a2 2 0 0 1-3.188 1.138l-3.405-2.57h-7.625L8.78 27.57a2 2 0 0 1-3.189-1.138l-1.545-6.954a2.01 2.01 0 0 1 .415-1.714l3.57-4.282c.12-1.574.482-3.12 1.072-4.584 1.612-4.043 4.5-6.579 5.671-7.481a2 2 0 0 1 2.45 0c1.167.902 4.059 3.438 5.671 7.48.59 1.465.952 3.01 1.072 4.585l3.57 4.282a2.01 2.01 0 0 1 .415 1.714m-17.404 4.25q-2.014-3.666-2.445-7.209L6 19.045 7.545 26l.022-.016zM17.5 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m8.5 6.545-2.104-2.525q-.428 3.535-2.445 7.211l2.982 2.25.022.017z" }) });
};
forwardRef(SvgRocket);
const SvgScissors = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M19.716 14.141a1 1 0 0 1 .261-1.391l8.458-5.788a1 1 0 0 1 1.125 1.652L21.101 14.4a1 1 0 0 1-1.39-.261zm10.109 10.634a1 1 0 0 1-1.39.261L17 17.211l-5.315 3.636a4.5 4.5 0 1 1-1.125-1.65L15.229 16l-4.673-3.198a4.5 4.5 0 1 1 1.125-1.65l17.875 12.233a1 1 0 0 1 .269 1.39M9 22.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m0-13a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0" }) });
};
forwardRef(SvgScissors);
const SvgSealCheck = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 16, height: 16, viewBox: "0 0 256 256", fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M225.86 102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28 23.51 138.44 16 128 16s-18.27 7.51-25.18 14.14c-3.94 3.77-8 7.67-11.57 9.14-3.25 1.36-8.69 1.44-13.94 1.52-9.76.15-20.82.31-28.51 8s-7.8 18.75-8 28.51c-.08 5.25-.16 10.67-1.52 13.94-1.47 3.56-5.37 7.63-9.14 11.57C23.51 109.72 16 117.56 16 128s7.51 18.27 14.14 25.18c3.77 3.94 7.67 8 9.14 11.57 1.36 3.27 1.44 8.69 1.52 13.94.15 9.76.31 20.82 8 28.51s18.75 7.85 28.51 8c5.25.08 10.67.16 13.94 1.52 3.56 1.47 7.63 5.37 11.57 9.14 6.9 6.63 14.74 14.14 25.18 14.14s18.27-7.51 25.18-14.14c3.94-3.77 8-7.67 11.57-9.14 3.27-1.36 8.69-1.44 13.94-1.52 9.76-.15 20.82-.31 28.51-8s7.85-18.75 8-28.51c.08-5.25.16-10.67 1.52-13.94 1.47-3.56 5.37-7.63 9.14-11.57 6.63-6.9 14.14-14.74 14.14-25.18s-7.51-18.27-14.14-25.18m-52.2 6.84-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32" }) });
};
forwardRef(SvgSealCheck);
const SvgSearch = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29.061 26.939 23.125 21A11.515 11.515 0 1 0 21 23.125l5.941 5.942a1.503 1.503 0 0 0 2.125-2.125zM5.5 14a8.5 8.5 0 1 1 8.5 8.5A8.51 8.51 0 0 1 5.5 14" }) });
};
const ForwardRef$v = forwardRef(SvgSearch);
const SvgServer = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26 5H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M26 17H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-3.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
const ForwardRef$u = forwardRef(SvgServer);
const SvgShield = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28 7v7.346c0 11.202-9.477 14.918-11.375 15.549a1.94 1.94 0 0 1-1.25 0C13.475 29.264 4 25.548 4 14.346V7a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2" }) });
};
forwardRef(SvgShield);
const SvgShirt = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m30.949 7.653-6.47-3.528A1 1 0 0 0 24 4h-4a1 1 0 0 0-1 1 3 3 0 0 1-6 0 1 1 0 0 0-1-1H8a1 1 0 0 0-.48.125L1.051 7.653a1.97 1.97 0 0 0-.824 2.657l2.41 4.601A2.05 2.05 0 0 0 4.458 16H7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V16h2.543a2.05 2.05 0 0 0 1.822-1.089l2.409-4.601a1.97 1.97 0 0 0-.825-2.658M4.459 14a.08.08 0 0 1-.051-.016L2.01 9.408 7 6.685V14zm23.134-.018a.07.07 0 0 1-.052.018H25V6.685l4.99 2.723z" }) });
};
forwardRef(SvgShirt);
const SvgShoppingCart = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M12 27a2 2 0 1 1-4 0 2 2 0 0 1 4 0m11-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m5.805-16.594A1 1 0 0 0 28 8H6.04L5.026 4.45A2.01 2.01 0 0 0 3.103 3H1a1 1 0 0 0 0 2h2.103l4.522 15.824A3.01 3.01 0 0 0 10.509 23h12.014a2.99 2.99 0 0 0 2.867-2.117l3.566-11.59a1 1 0 0 0-.151-.887" }) });
};
forwardRef(SvgShoppingCart);
const SvgSignOut = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M14.5 27a1.5 1.5 0 0 1-1.5 1.5H6A2.5 2.5 0 0 1 3.5 26V6A2.5 2.5 0 0 1 6 3.5h7a1.5 1.5 0 0 1 0 3H6.5v19H13a1.5 1.5 0 0 1 1.5 1.5m13.561-12.061-5-5a1.503 1.503 0 0 0-2.125 2.125l2.439 2.436H13a1.5 1.5 0 1 0 0 3h10.375l-2.44 2.439a1.503 1.503 0 0 0 2.125 2.125l5-5a1.5 1.5 0 0 0 .001-2.125" }) });
};
forwardRef(SvgSignOut);
const SvgSlidersHorizontal = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M4 10a1 1 0 0 1 1-1h4.646a3.5 3.5 0 0 1 6.708 0H27a1 1 0 1 1 0 2H16.354a3.5 3.5 0 0 1-6.708 0H5a1 1 0 0 1-1-1m23 11h-2.646a3.5 3.5 0 0 0-6.708 0H5a1 1 0 0 0 0 2h12.646a3.5 3.5 0 0 0 6.708 0H27a1 1 0 1 0 0-2" }) });
};
forwardRef(SvgSlidersHorizontal);
const SvgSparkle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M26 18a1.97 1.97 0 0 1-1.302 1.867l-6.457 2.375-2.375 6.452a1.99 1.99 0 0 1-3.735 0L9.75 22.25l-6.452-2.375a1.99 1.99 0 0 1 0-3.735l6.456-2.375 2.375-6.451a1.99 1.99 0 0 1 3.735 0l2.375 6.456 6.451 2.375A1.97 1.97 0 0 1 26 18M19 6h2v2a1 1 0 0 0 2 0V6h2a1 1 0 1 0 0-2h-2V2a1 1 0 1 0-2 0v2h-2a1 1 0 1 0 0 2m11 4h-1V9a1 1 0 1 0-2 0v1h-1a1 1 0 0 0 0 2h1v1a1 1 0 0 0 2 0v-1h1a1 1 0 0 0 0-2" }) });
};
forwardRef(SvgSparkle);
const SvgSquaresFour = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M15 7v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2m10-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M13 17H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m12 0h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2" }) });
};
forwardRef(SvgSquaresFour);
const SvgStack = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: [
    /* @__PURE__ */ jsx("path", { d: "M27.5 21.136 16 27.843 4.5 21.136a1 1 0 0 0-1 1.728l12 7a1 1 0 0 0 1.008 0l12-7a1 1 0 1 0-1.008-1.728" }),
    /* @__PURE__ */ jsx("path", { d: "M27.5 15.136 16 21.843 4.5 15.136a1 1 0 0 0-1 1.728l12 7a1 1 0 0 0 1.008 0l12-7a1 1 0 1 0-1.008-1.728" }),
    /* @__PURE__ */ jsx("path", { d: "m3.5 10.864 12 7a1 1 0 0 0 1.008 0l12-7a1 1 0 0 0 0-1.728l-12-7a1 1 0 0 0-1.008 0l-12 7a1 1 0 0 0 0 1.728" })
  ] });
};
forwardRef(SvgStack);
const SvgStar = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m29.313 14.298-5.638 4.92 1.689 7.325a2 2 0 0 1-2.98 2.167l-6.389-3.875L9.62 28.71a2 2 0 0 1-2.98-2.168l1.686-7.317-5.638-4.928a2 2 0 0 1 1.138-3.507l7.433-.644 2.901-6.92a1.994 1.994 0 0 1 3.68 0l2.91 6.92 7.43.644a2 2 0 0 1 1.139 3.508z" }) });
};
forwardRef(SvgStar);
const SvgStethoscope = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29 19a4 4 0 1 0-4.991 3.875A1 1 0 0 0 24 23a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4v-5.065c3.934-.5 7-3.934 7-8.039V5a2 2 0 0 0-2-2h-2a1 1 0 1 0 0 2h2v4.896c0 3.323-2.656 6.061-5.92 6.104A6 6 0 0 1 6 10V5h2a1 1 0 0 0 0-2H6a2 2 0 0 0-2 2v5a8 8 0 0 0 7 7.936V23a6.006 6.006 0 0 0 6 6h3a6.006 6.006 0 0 0 6-6 1 1 0 0 0-.009-.125A4 4 0 0 0 29 19m-4 1a1 1 0 1 1 0-2 1 1 0 0 1 0 2" }) });
};
forwardRef(SvgStethoscope);
const SvgStop = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 256 256", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" }) });
};
forwardRef(SvgStop);
const SvgStore = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29 12a1 1 0 0 0-.038-.275L27.17 5.45A2.01 2.01 0 0 0 25.25 4H6.75a2.01 2.01 0 0 0-1.919 1.45L3.04 11.725A1 1 0 0 0 3 12v2a5 5 0 0 0 2 4v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-8a5 5 0 0 0 2-4zm-18 2a3 3 0 0 1-4.39 2.657 1 1 0 0 0-.228-.132A3 3 0 0 1 5 14v-1h6zm8 0a3 3 0 0 1-6 0v-1h6zm8 0a3 3 0 0 1-1.384 2.525q-.12.051-.225.131A3 3 0 0 1 21 14v-1h6z" }) });
};
forwardRef(SvgStore);
const SvgStrikeThrough = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 16a1.5 1.5 0 0 1-1.5 1.5h-3.767A5.19 5.19 0 0 1 24.5 21c0 1.806-.976 3.54-2.679 4.756C20.25 26.881 18.18 27.5 16 27.5s-4.25-.619-5.821-1.744C8.476 24.54 7.5 22.806 7.5 21a1.5 1.5 0 0 1 3 0c0 1.898 2.519 3.5 5.5 3.5s5.5-1.602 5.5-3.5c0-1.595-1.163-2.523-4.419-3.5H5a1.5 1.5 0 1 1 0-3h22a1.5 1.5 0 0 1 1.5 1.5M9.389 12.5a1.5 1.5 0 0 0 1.5-1.5c0-2 2.197-3.5 5.111-3.5 2.17 0 3.921.831 4.685 2.223a1.5 1.5 0 0 0 2.625-1.446C22.016 5.914 19.281 4.5 16 4.5c-4.625 0-8.111 2.794-8.111 6.5a1.5 1.5 0 0 0 1.5 1.5" }) });
};
forwardRef(SvgStrikeThrough);
const SvgSun = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M15 5V2a1 1 0 0 1 2 0v3a1 1 0 0 1-2 0m1 3a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8m-8.707.707a1 1 0 1 0 1.414-1.415l-2-2a1 1 0 1 0-1.414 1.415zm0 14.586-2 2a1 1 0 1 0 1.414 1.415l2-2a1 1 0 1 0-1.415-1.415M24 9a1 1 0 0 0 .707-.293l2-2a1 1 0 0 0-1.415-1.414l-2 2A1 1 0 0 0 24 9m.707 14.293a1 1 0 1 0-1.415 1.415l2 2a1 1 0 0 0 1.415-1.415zM6 16a1 1 0 0 0-1-1H2a1 1 0 0 0 0 2h3a1 1 0 0 0 1-1m10 10a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1m14-11h-3a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2" }) });
};
forwardRef(SvgSun);
const SvgTelevision = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 8h-8.586l4.293-4.292a1 1 0 0 0-1.415-1.415L16 7.586l-5.292-5.293a1 1 0 1 0-1.415 1.415L13.586 8H5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2m0 17h-7V10h7zm-2-10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" }) });
};
forwardRef(SvgTelevision);
const SvgThumbDown = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m29.978 19.625-1.5-12A3 3 0 0 0 25.5 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h5.383l4.722 9.448A1 1 0 0 0 15 30a5 5 0 0 0 5-5v-2h7a3 3 0 0 0 2.977-3.375M9 18H4V7h5z" }) });
};
forwardRef(SvgThumbDown);
const SvgThumbUp = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M29.25 10.015A3 3 0 0 0 27 9h-7V7a5 5 0 0 0-5-5 1 1 0 0 0-.895.553L9.383 12H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h21.5a3 3 0 0 0 2.977-2.625l1.5-12a3 3 0 0 0-.727-2.36M4 14h5v11H4z" }) });
};
forwardRef(SvgThumbUp);
const SvgTrain = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M23 3H9a4 4 0 0 0-4 4v16a4 4 0 0 0 4 4h1l-1.8 2.4a1 1 0 0 0 1.6 1.2l2.7-3.6h7l2.7 3.6a1 1 0 0 0 1.6-1.2L22 27h1a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4M10.5 23a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m4.5-8H7v-5h8zm6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m3.5-8h-8v-5h8z" }) });
};
forwardRef(SvgTrain);
const SvgTrash = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M27 6h-5V5a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v1H5a1 1 0 0 0 0 2h1v18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h1a1 1 0 1 0 0-2M14 21a1 1 0 0 1-2 0v-8a1 1 0 0 1 2 0zm6 0a1 1 0 0 1-2 0v-8a1 1 0 0 1 2 0zm0-15h-8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z" }) });
};
forwardRef(SvgTrash);
const SvgTrendUp = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 16", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M15.583 3.5v4a.75.75 0 1 1-1.5 0V5.313l-4.72 4.72a.75.75 0 0 1-1.062 0l-1.968-1.97-3.97 3.968a.751.751 0 1 1-1.062-1.063l4.5-4.5a.75.75 0 0 1 1.063 0l1.969 1.97 4.188-4.188h-2.188a.75.75 0 1 1 0-1.5h4a.75.75 0 0 1 .75.75" }) });
};
forwardRef(SvgTrendUp);
const SvgTyphoon = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m23.54 2.267-3.711 3.377c1.7.52 3.298 1.397 4.653 2.631 4.684 4.266 4.684 11.184 0 15.45q-5.184 4.72-16.021 6.008l3.71-3.377a12.2 12.2 0 0 1-4.653-2.63c-4.684-4.267-4.712-11.16 0-15.45q5.184-4.721 16.021-6.01m-7.54 8.4c-3.314 0-6 2.388-6 5.333s2.686 5.333 6 5.333 6-2.387 6-5.333c0-2.945-2.686-5.333-6-5.333" }) });
};
forwardRef(SvgTyphoon);
const SvgUnderline = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M25.5 28a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 1 1 0-3h16a1.5 1.5 0 0 1 1.5 1.5M16 24.5a8.51 8.51 0 0 0 8.5-8.5V7a1.5 1.5 0 1 0-3 0v9a5.5 5.5 0 0 1-11 0V7a1.5 1.5 0 1 0-3 0v9a8.51 8.51 0 0 0 8.5 8.5" }) });
};
forwardRef(SvgUnderline);
const SvgUpload = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.5 19v7a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 26v-7a1.5 1.5 0 0 1 3 0v6.5h19V19a1.5 1.5 0 1 1 3 0m-16.439-7.939L14.5 8.625V19a1.5 1.5 0 1 0 3 0V8.625l2.439 2.44a1.503 1.503 0 0 0 2.125-2.125l-5-5a1.5 1.5 0 0 0-2.125 0l-5 5a1.503 1.503 0 1 0 2.125 2.125z" }) });
};
const ForwardRef$7 = forwardRef(SvgUpload);
const SvgUser = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M28.866 27.5A1 1 0 0 1 28 28H4a1 1 0 0 1-.865-1.5c1.904-3.291 4.838-5.651 8.261-6.77a9 9 0 1 1 9.208 0c3.424 1.119 6.357 3.479 8.261 6.77a1 1 0 0 1 .001 1" }) });
};
const ForwardRef$6 = forwardRef(SvgUser);
const SvgVolumeMute = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M19.44 3.101a1 1 0 0 0-1.054.11L9.656 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h5.656l8.73 6.789A1 1 0 0 0 20 28V4a1 1 0 0 0-.56-.899M28.414 16l2.293-2.292a1.001 1.001 0 0 0-1.415-1.415L27 14.586l-2.293-2.293a1 1 0 1 0-1.415 1.415L25.587 16l-2.293 2.293a1 1 0 0 0 1.415 1.415L27 17.414l2.293 2.294a1 1 0 0 0 1.415-1.415z" }) });
};
forwardRef(SvgVolumeMute);
const SvgVolumeUp = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M19.439 3.101a1 1 0 0 0-1.053.11L9.656 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h5.656l8.73 6.789A1.001 1.001 0 0 0 20 28V4a1 1 0 0 0-.561-.899M9 20H4v-8h5zm15.75-7.305a5 5 0 0 1 0 6.61 1 1 0 0 1-1.5-1.322 3 3 0 0 0 0-3.966 1 1 0 0 1 1.5-1.322M31 16a10 10 0 0 1-2.546 6.668 1 1 0 0 1-1.49-1.334 8 8 0 0 0 0-10.666.998.998 0 0 1 .407-1.624 1 1 0 0 1 1.083.29A9.98 9.98 0 0 1 31 16" }) });
};
forwardRef(SvgVolumeUp);
const SvgWalk = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M15 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0m11 11c-3.58 0-5.226-1.662-6.969-3.421a25 25 0 0 0-1.375-1.323C13.031 8.24 5.63 15.098 5.316 15.391a1 1 0 0 0 1.369 1.458 20.5 20.5 0 0 1 3.815-2.724c1.723-.922 3.174-1.279 4.338-1.072L8.082 28.6a1 1 0 0 0 1.835.798l4.2-9.659L18 22.515V29a1 1 0 1 0 2 0v-7a1 1 0 0 0-.419-.814l-4.65-3.321L16.61 14c.33.305.657.634 1 .98C19.381 16.774 21.586 19 26 19a1 1 0 0 0 0-2" }) });
};
forwardRef(SvgWalk);
const SvgWarningCircle = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M16 3a13 13 0 1 0 13 13A13.013 13.013 0 0 0 16 3m-1 7a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0zm1 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" }) });
};
forwardRef(SvgWarningCircle);
const SvgWebhooks = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 16", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "M3.468 10 5.9 5.786l-.14-.243a3 3 0 1 1 5.316-2.76.51.51 0 0 1-.2.65.5.5 0 0 1-.71-.233 2 2 0 1 0-3.542 1.84l.864 1.496a.5.5 0 0 1 0 .5L5.2 11a1 1 0 0 1-1.731-1m8.812-2.5h-.771l-2.31-4a1 1 0 0 0-1.731 1l2.165 3.75a.5.5 0 0 0 .432.25h2.227c1.118 0 2.06.915 2.041 2.033a2 2 0 0 1-1.98 1.967.515.515 0 0 0-.518.458.5.5 0 0 0 .5.542 3.003 3.003 0 0 0 3-3.058c-.034-1.643-1.41-2.942-3.052-2.942zm1.053 2.952c-.025-.538-.489-.952-1.027-.952H7.51a.5.5 0 0 0-.433.25l-1.01 1.75a2 2 0 1 1-3.342-2.187.51.51 0 0 0-.058-.688.5.5 0 0 0-.732.073A3 3 0 1 0 6.93 12l.289-.5h5.114a1 1 0 0 0 1-1.048" }) });
};
forwardRef(SvgWebhooks);
const SvgWheelchair = ({
  fill: fillProp = "currentColor",
  stroke: strokeProp,
  ...props
}, ref) => {
  const {
    colors
  } = useTheme();
  const fill = fillProp && fillProp in colors ? colors[fillProp] : fillProp;
  const stroke = strokeProp && strokeProp in colors ? colors[strokeProp] : strokeProp;
  return /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", width: 16, height: 16, fill, stroke, ref, ...props, children: /* @__PURE__ */ jsx("path", { d: "m31.316 24.949-3 1a1 1 0 0 1-1.211-.5l-3.724-7.45H13a1 1 0 0 1-1-1v-3.707A7 7 0 0 0 14 27c3.239 0 6.261-2.256 7.031-5.25a1 1 0 1 1 1.938.5C21.96 26.162 18.19 29 14 29a9 9 0 0 1-2-17.774V8.851a3.5 3.5 0 1 1 2 0V11h7a1 1 0 0 1 0 2h-7v3h10a1 1 0 0 1 .894.552l3.612 7.225 2.178-.726a1 1 0 1 1 .632 1.898" }) });
};
forwardRef(SvgWheelchair);
const PluginIcon = () => /* @__PURE__ */ jsx(ForwardRef$u, {});
const index = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID
    });
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.plugin.name`,
          defaultMessage: "Socket.IO"
        }
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.title`,
            defaultMessage: "Settings"
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}/settings`,
          Component: () => import("./SettingsPage-C8LE0zB6.mjs").then((mod) => ({ default: mod.SettingsPage }))
        },
        {
          intlLabel: {
            id: `${PLUGIN_ID}.monitoring.title`,
            defaultMessage: "Monitoring"
          },
          id: `${PLUGIN_ID}-monitoring`,
          to: `${PLUGIN_ID}/monitoring`,
          Component: () => import("./MonitoringPage-qEBKt6Tk.mjs").then((mod) => ({ default: mod.MonitoringPage }))
        }
      ]
    );
    if ("widgets" in app) {
      app.widgets.register({
        icon: PluginIcon,
        title: {
          id: `${PLUGIN_ID}.widget.socket-stats.title`,
          defaultMessage: "Socket.IO Stats"
        },
        component: async () => {
          const component = await import("./SocketStatsWidget-Bd384zSA.mjs");
          return component.SocketStatsWidget;
        },
        id: "socket-io-stats-widget",
        pluginId: PLUGIN_ID
      });
      console.log(`[${PLUGIN_ID}] ✅ Socket.IO Stats Widget registered`);
    }
  },
  bootstrap(app) {
    console.log(`[${PLUGIN_ID}] Bootstrapping plugin...`);
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/de.json": () => import("./de-BoFxKIL3.mjs"), "./translations/en.json": () => import("./en-B4_6Q0aQ.mjs"), "./translations/es.json": () => import("./es-CCwv5Ulk.mjs"), "./translations/fr.json": () => import("./fr-DtBI9vH_.mjs"), "./translations/pt.json": () => import("./pt-I9epJZpI.mjs") }), `./translations/${locale}.json`, 3).then(({ default: data }) => {
          return {
            data: prefixPluginTranslations(data, PLUGIN_ID),
            locale
          };
        }).catch(() => {
          return {
            data: {},
            locale
          };
        });
      })
    );
    return Promise.resolve(importedTrads);
  }
};
const prefixPluginTranslations = (trad, pluginId) => {
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {});
};
export {
  ForwardRef$20 as F,
  PLUGIN_ID as P,
  ForwardRef$7 as a,
  ForwardRef$2o as b,
  ForwardRef$6 as c,
  ForwardRef$14 as d,
  ForwardRef$1g as e,
  ForwardRef$2v as f,
  ForwardRef$1b as g,
  ForwardRef$12 as h,
  ForwardRef$1U as i,
  ForwardRef$2j as j,
  ForwardRef$2k as k,
  ForwardRef$26 as l,
  ForwardRef$2x as m,
  ForwardRef$2h as n,
  ForwardRef$v as o,
  index as p
};
