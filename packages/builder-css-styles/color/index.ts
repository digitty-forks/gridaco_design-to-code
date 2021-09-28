import { CssNamedColor, ICssRGBA } from "@coli.codes/css/css-color";
import { Color, RGB } from "@reflect-ui/core/lib/color";

type HexColor = string;

type CssColorInputLike = CssNamedColor | HexColor | ICssRGBA;

export function color(input: CssColorInputLike | Color): string {
  if (!input) {
    return;
    console.warn(
      'undefined color is passed to "makeCssColorValue". check this.'
    );
    // "#000000; /*ERROR*/";
  }
  if (typeof input == "string") {
    // interpret as hex color or named color
    return input;
  } else if (input instanceof CssNamedColor) {
    return input.name;
  } else if (typeof input == "object") {
    // with alpha
    if ("r" in input && "a" in input) {
      const a = safe_alpha_fallback(validAlphaValue(input.a));
      const rgba = input as ICssRGBA;
      const _r = validColorValue(rgba.r) ?? 0;
      const _g = validColorValue(rgba.g) ?? 0;
      const _b = validColorValue(rgba.b) ?? 0;
      return `rgba(${_r}, ${_g}, ${_b}, ${a})`;
    }
    // no alpha
    else if ("r" in input && "a"! in input) {
      const rgb = input as RGB;
      return `rgb(${validColorValue(rgb.r) ?? 0}, ${
        validColorValue(rgb.g) ?? 0
      }, ${validColorValue(rgb.b) ?? 0})`;
    }
  } else {
    throw `input color "${JSON.stringify(
      input
    )}" cannot be interpreted as valid css color value`;
  }
}

const validColorValue = (f: number) => {
  if (f === undefined) {
    return;
  }
  if (f <= 1) {
    return Math.round(f * 255.0);
  } else {
    return Math.round(f);
  }
};

const safe_alpha_fallback = (f: number) => {
  if (f === undefined) {
    return 1;
  }
  return f;
};

/**
 * returns rounded alpha value at decimal point 2.
 * @param f
 * @returns
 */
const validAlphaValue = (f: number) => {
  try {
    if (f === 0) {
      return 0;
    }
    // from https://stackoverflow.com/a/11832950/5463235
    return Math.round((f + Number.EPSILON) * 100) / 100;
  } catch (_) {
    console.error(_);
    return;
  }
};
