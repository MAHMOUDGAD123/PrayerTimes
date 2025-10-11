import { _Storage } from "./storage";
import { en_ar } from "./translation_map";

// Fix loader lang switch at initial load
window.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("lang fix");
    /** @type {HTMLElement} */
    const loadingEle = document.querySelector(".loading");
    /** @type {boolean} */
    const isEn = _Storage.read("__prayertimes_lang__", "localStorage");
    if (!isEn) {
      loadingEle.style.direction = "rtl";
      /**@type {HTMLElement[]} */
      const all_txt = document.querySelectorAll("[data-en]");
      all_txt.forEach((el) => {
        const en_txt = el.dataset.en;
        el.textContent = en_ar.get(en_txt);
      });
    }
  },
  { once: true }
);
