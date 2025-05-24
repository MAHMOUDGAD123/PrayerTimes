//=================== API Start ====================
import {
  fetch_geolocation,
  fetch_address,
  fetch_prayers_times,
} from "./api.js";
import { en_ar } from "./translation_map.js";
import { _Storage } from "./storage.js";
//==================== API End =====================

//==================== Data & tools Start =====================
const lang_storage_key = "__prayertimes_lang__";
const coords_storage_key = "__prayertimes_coords__";
const address_storage_key = "__prayertimes_adrs__";

let curr_prayer_key = 0;
/**@type {HTMLDivElement}*/
let curr_page = null;
/**@type {{latitude: number, longitude: number} | null} */
let coordinates = readCoordinates();
/**@type {{display_name: string, short_name: string} | null} */
let currentAddress = readAddress();

/**@type {Intl.NumberFormat}*/
let globalNumberFormatter;

/**
 * - English --> true
 * - Arabic ---> false
 */
let lang = readLang();

// page_btn_id => page_id
const page_btn = new Map([
  ["prayerTimesPage", "prayer_times_btn"],
  ["monthCalendarPage", "month_cal_btn"],
  ["settingsPage", "settings_btn"],
]);

// settings_switch_id => action_function
const settings_switches = new Map([
  ["langSwitch", set_lang],
  ["updateLocationSwitch", update_location],
]);

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const prayers = new Map([
  [
    1,
    {
      name: "Lastthird",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    2,
    {
      name: "Imsak",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    3,
    {
      name: "Fajr",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    4,
    {
      name: "Sunrise",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    5,
    {
      name: "Dhuhr",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    6,
    {
      name: "Asr",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    7,
    {
      name: "Maghrib",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    8,
    {
      name: "Isha",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    9,
    {
      name: "Firstthird",
      s_time: "",
      time: {
        hr: 0,
        min: 0,
      },
    },
  ],
  [
    10,
    {
      name: "Midnight",
      s_time: "00:00",
      time: {
        hr: 23,
        min: 59.9,
      },
    },
  ],
]);

/**@param {string} time*/
function get_time_only(time) {
  return time.slice(0, 5);
}

function is_end_of_day() {
  return curr_prayer_key >= prayers.size;
}

/**@param {string} text*/
function translate_text(text) {
  return lang ? text : en_ar.get(text);
}

function show_bad_internet() {
  const bad_net_icon = curr_page.querySelector("i.bad-net");
  bad_net_icon.style.display = "block";

  setTimeout(() => {
    bad_net_icon.style.display = "none";
  }, 2500);
}

/**@param {number} n*/
function leading_zero_num_en(n) {
  return n.toString().padStart(2, "0");
}

/**@param {number} n*/
function leading_zero_num_ar(n) {
  return n.toString().padStart(2, "۰");
}

/**@param {number} n*/
function to_arabic_number(n) {
  return globalNumberFormatter.format(n);
}

function saveCoordinates() {
  _Storage.save(coords_storage_key, coordinates, "localStorage");
}

/**@returns {{latitude: number, longitude: number} | null}*/
function readCoordinates() {
  return _Storage.read(coords_storage_key, "localStorage");
}

/**@param {boolean} lang*/
function saveLang(lang) {
  _Storage.save(lang_storage_key, lang, "localStorage");
}

/**@returns {boolean | null}*/
function readLang() {
  return _Storage.read(lang_storage_key, "localStorage");
}

function saveAddress() {
  _Storage.save(address_storage_key, currentAddress, "localStorage");
}

/**@returns {{display_name: string, short_name: string} | null}*/
function readAddress() {
  return _Storage.read(address_storage_key, "localStorage");
}

function reset_app_setting() {
  _Storage.delete(coords_storage_key, "localStorage");
  _Storage.delete(address_storage_key, "localStorage");
  coordinates = null;
  currentAddress = null;
}

//===================== Data & tools End ======================

//===================== initialization Start ======================
// set the initial page
curr_page = document.getElementById("prayerTimesPage");
curr_page.classList.add("picked");
document.getElementById(page_btn.get(curr_page.id)).classList.add("picked");
// set month calendar page selections
initiate_month_year_selections();
set_lang();
app_initiate();
prepare_table_selections();
prepare_settings_switches();
set_update_time_interval();
prepare_navigation_switches();
setTimeout(hide_app_loader_screen, 1500);
requestnotificationAccess();

async function app_initiate() {
  try {
    if (!coordinates) {
      coordinates = await fetch_geolocation();
      saveCoordinates();
    }

    const { latitude, longitude } = coordinates;

    // get data from api
    const data = await fetch_prayers_times(latitude, longitude);

    // do nothing if null
    if (data) {
      // Prayer Times Page
      const _today = data[new Date().getDate() - 1];
      set_times_dates(_today);
      const next_prayer_key = get_next_prayer_key();
      set_next_prayer(next_prayer_key);

      // Month Calendar Page
      build_month_calendar(data);
    } else {
      throw new Error("Faild To Get The Prayers Times 🟥");
    }

    if (currentAddress) {
      set_location();
    } else {
      currentAddress = await fetch_address(latitude, longitude);
      if (!currentAddress) {
        throw new Error("Faild To Get Your Address 🟥");
      }
      set_location();
      saveAddress();
    }
    return true;
  } catch (error) {
    // show_bad_internet();
    console.error(error);
    return false;
  }
}

//====================== initialization End =======================

function set_lang() {
  /**@type {HTMLElement[]} */
  const all_txt = document.querySelectorAll("[data-en]");
  /**@type {HTMLElement[]} */
  const all_nums = document.querySelectorAll("[data-num]");
  const logo = document.querySelector(".logo > .txt");
  const _switch = document.getElementById("langSwitch");

  if (lang) {
    lang = false;
    _switch.classList.add("on");
    document.body.classList.add("ar");
    logo.classList.add("ar");
    globalNumberFormatter = new Intl.NumberFormat("AR-EG", {
      useGrouping: false,
    });

    // set text
    all_txt.forEach((ele) => {
      const en_txt = ele.dataset.en;
      ele.textContent = en_ar.get(en_txt);
    });

    // set numbers
    all_nums.forEach((ele) => {
      ele.textContent = leading_zero_num_ar(to_arabic_number(+ele.dataset.num));
    });
  } else {
    lang = true;
    _switch.classList.remove("on");
    document.body.classList.remove("ar");
    logo.classList.remove("ar");
    globalNumberFormatter = new Intl.NumberFormat("EN-US", {
      useGrouping: false,
    });

    all_txt.forEach((ele) => {
      const en_txt = ele.dataset.en;
      ele.textContent = en_txt;
    });

    // set numbers
    all_nums.forEach((ele) => {
      ele.textContent = leading_zero_num_en(+ele.dataset.num);
    });
  }
  saveLang(!lang);
}

function set_location() {
  // add the location
  const main_page_address_ele = document.getElementById("mainPageAddress");
  const settings_page_address_ele =
    document.getElementById("setttingsLocation");
  main_page_address_ele.textContent = currentAddress.short_name ?? "- - -";
  settings_page_address_ele.textContent =
    currentAddress.display_name ?? "- - -";
}

function hide_app_loader_screen() {
  /**@type {HTMLDivElement}*/
  const appLoaderScreen = document.getElementById("appLoaderScreen");
  /**@type {HTMLElement}*/
  const header = document.querySelector("header");

  // shrink the loading screen to free space to the logo
  appLoaderScreen.classList.add("shrink");
  // move logo to the top of the screen
  header.classList.remove("loading");

  setTimeout(() => {
    // fade-out the loading screen
    appLoaderScreen.classList.add("fade-out");

    setTimeout(() => {
      // remove the loading screen and the header spinner
      appLoaderScreen.remove();
      header.querySelector(".spinner").remove();
    }, 2000);
  }, 700);
}

/**
 * activate or stop the loading state
 * @param {"add" | "remove"} action
 */
function location_loading(action) {
  /**@type {HTMLLegendElement} */
  const locationLegend = document.getElementById("locationLegend");
  /**@type {HTMLButtonElement} */
  const updateLocationSwitch = document.getElementById("updateLocationSwitch");
  locationLegend.classList[action]("loading");
  updateLocationSwitch.disabled = action === "add";
}

/**@param {boolean} success*/
function location_fetch_result(success) {
  /**@type {HTMLLegendElement} */
  const locationLegend = document.getElementById("locationLegend");
  /**@type {HTMLParagraphElement} */
  const locationUpdateMsg = document.getElementById("locationUpdateMsg");
  const result = success ? "success" : "faild";
  locationLegend.classList.add(result);
  const english_msg = success
    ? "Location Updated Successfully"
    : "Location Updated Successfully";
  locationUpdateMsg.dataset.en = english_msg;
  const potentially_translated_msg = translate_text(english_msg);
  locationUpdateMsg.textContent = potentially_translated_msg;
  locationUpdateMsg.classList.add("show");
  setTimeout(() => {
    locationLegend.classList.remove(result);
    locationUpdateMsg.classList.remove("show");
  }, 5000);
}

async function update_location() {
  // remove any previous states
  /**@type {HTMLLegendElement} */
  const locationLegend = document.getElementById("locationLegend");
  /**@type {HTMLParagraphElement} */
  const locationUpdateMsg = document.getElementById("locationUpdateMsg");
  locationLegend.classList.remove("success", "faild");
  locationUpdateMsg.classList.remove("show");
  // start loading
  location_loading("add");
  reset_app_setting();
  set_month_year_selections_to_current();
  const update_result = await app_initiate();
  location_loading("remove");
  location_fetch_result(update_result);
}

//---------- prayer Times Page ----------
async function update_dates_times() {
  // use this function to update the (dates & times) at the end of the day
  // get data from api
  const data = await fetch_prayers_times(
    coordinates.latitude,
    coordinates.longitude
  );

  // do nothing if null
  if (data) {
    const _today = data[new Date().getDate() - 1];
    set_times_dates(_today);
    set_next_prayer(1);
  } else {
    show_bad_internet();
  }
}

// set dates & times
function set_times_dates(_today) {
  const gregorian = _today.date.gregorian;
  const hijri = _today.date.hijri;
  const timings = _today.timings;

  /**@param {string} time*/
  function get_hr_min(time) {
    const hr = +time.slice(0, 2);
    const min = +time.slice(3, 5);
    return [hr, min];
  }

  // weekday
  /**@type {HTMLDivElement}*/
  const today_name = document.getElementById("today");
  const weekday = gregorian.weekday.en;
  today_name.dataset.en = weekday; // save the english word

  // dates
  /**@type {HTMLDivElement}*/
  const h_month_ele = document.querySelector(".month > .hijri");
  /**@type {HTMLDivElement}*/
  const g_month_ele = document.querySelector(".month > .melady");
  const h_month_name = hijri.month.en;
  const g_month_name = gregorian.month.en;
  g_month_ele.dataset.en = g_month_name;
  h_month_ele.dataset.en = h_month_name;

  const h_day_num = hijri.day;
  const g_day_num = gregorian.day;
  const h_year_num = hijri.year;
  const g_year_num = gregorian.year;

  /**@type {HTMLDivElement}*/
  const h_m_y_ele = document.getElementById("d-m-y");
  /**@type {HTMLDivElement}*/
  const h_day_ele = h_m_y_ele.querySelector(".day > .hijri");
  /**@type {HTMLDivElement}*/
  const g_day_ele = h_m_y_ele.querySelector(".day > .melady");
  /**@type {HTMLDivElement}*/
  const h_year_ele = h_m_y_ele.querySelector(".year > .hijri");
  /**@type {HTMLDivElement}*/
  const g_year_ele = h_m_y_ele.querySelector(".year > .melady");

  // save the value in data-num attribute
  h_day_ele.dataset.num = h_day_num;
  g_day_ele.dataset.num = g_day_num;
  h_year_ele.dataset.num = h_year_num;
  g_year_ele.dataset.num = g_year_num;

  if (lang) {
    today_name.textContent = weekday;
    h_month_ele.textContent = h_month_name;
    g_month_ele.textContent = g_month_name;

    h_day_ele.textContent = h_day_num;
    g_day_ele.textContent = g_day_num;
    h_year_ele.textContent = h_year_num;
    g_year_ele.textContent = g_year_num;
  } else {
    today_name.textContent = en_ar.get(weekday);
    h_month_ele.textContent = en_ar.get(h_month_name);
    g_month_ele.textContent = en_ar.get(g_month_name);

    h_day_ele.textContent = leading_zero_num_ar(to_arabic_number(h_day_num));
    g_day_ele.textContent = leading_zero_num_ar(to_arabic_number(g_day_num));
    h_year_ele.textContent = to_arabic_number(h_year_num);
    g_year_ele.textContent = to_arabic_number(g_year_num);
  }

  /**@type {HTMLDivElement}*/
  const prayers_times_ele = document.getElementById("prayersTimes");

  // save_times except midnight (ignore the midnight it's not a prayer)
  for (let i = 1, len = prayers.size; i < len; ++i) {
    // save data in the map
    const prayer = prayers.get(i);
    const time = timings[`${prayer.name}`];
    const [hr, min] = get_hr_min(time);
    prayer.s_time = get_time_only(time);
    prayer.time.hr = hr;
    prayer.time.min = min;
    // update DOM
    const prayer_time_ele = prayers_times_ele.querySelector(
      `.${prayer.name.toLowerCase()} > .time`
    );
    const prayer_time_hr_ele = prayer_time_ele.querySelector(".hr");
    const prayer_time_min_ele = prayer_time_ele.querySelector(".min");
    // save the value in data-num attribute
    prayer_time_hr_ele.dataset.num = hr;
    prayer_time_min_ele.dataset.num = min;
    // print the values
    if (lang) {
      prayer_time_hr_ele.textContent = leading_zero_num_en(hr);
      prayer_time_min_ele.textContent = leading_zero_num_en(min);
    } else {
      prayer_time_hr_ele.textContent = leading_zero_num_ar(
        to_arabic_number(hr)
      );
      prayer_time_min_ele.textContent = leading_zero_num_ar(
        to_arabic_number(min)
      );
    }
  }

  // set the midnight time
  const midnight_time_ele =
    prayers_times_ele.querySelector(`.midnight > .time`);
  const midnight_time_hr_ele = midnight_time_ele.querySelector(".hr");
  const midnight_time_min_ele = midnight_time_ele.querySelector(".min");
  // save the value in data-num attribute
  midnight_time_hr_ele.dataset.num = 0;
  midnight_time_min_ele.dataset.num = 0;
  // print the values
  if (lang) {
    midnight_time_hr_ele.textContent = "00";
    midnight_time_min_ele.textContent = "00";
  } else {
    midnight_time_hr_ele.textContent = "۰۰";
    midnight_time_min_ele.textContent = "۰۰";
  }
}

// prayer counter down
function set_counter_down(key) {
  const untill = new Date();
  const curr_prayer_time = prayers.get(key).time;
  const hr = curr_prayer_time.hr;
  const min = curr_prayer_time.min;
  untill.setHours(hr, min, 0, 0);

  /**@type {HTMLDivElement}*/
  const hr_ele = document.querySelector(".counter-down > .hr");
  /**@type {HTMLDivElement}*/
  const min_ele = document.querySelector(".counter-down > .min");
  /**@type {HTMLDivElement}*/
  const sec_ele = document.querySelector(".counter-down > .sec");

  const ms_hr = 1000 * 60 * 60;
  const ms_min = 1000 * 60;
  const ms_sec = 1000;

  // count down interval
  const intervId = setInterval(() => {
    const now = Date.now();
    const diff = untill - now;

    const hrs = (diff / ms_hr) >>> 0;
    const mins = ((diff % ms_hr) / ms_min) >>> 0;
    const secs = ((diff % ms_min) / ms_sec) >>> 0;

    // save the value in the data-num attribute
    hr_ele.dataset.num = hrs;
    min_ele.dataset.num = mins;
    sec_ele.dataset.num = secs;

    if (lang) {
      hr_ele.textContent = leading_zero_num_en(hrs);
      min_ele.textContent = leading_zero_num_en(mins);
      sec_ele.textContent = leading_zero_num_en(secs);
    } else {
      hr_ele.textContent = leading_zero_num_ar(to_arabic_number(hrs));
      min_ele.textContent = leading_zero_num_ar(to_arabic_number(mins));
      sec_ele.textContent = leading_zero_num_ar(to_arabic_number(secs));
    }

    if (diff <= 0) {
      clearInterval(intervId);
      let athan_time_out = 60000;

      hr_ele.textContent = lang ? "00" : "۰۰";
      min_ele.textContent = lang ? "00" : "۰۰";
      sec_ele.textContent = lang ? "00" : "۰۰";

      const counter_down = document.querySelector(
        ".times > .next-prayer > .counter-down"
      );
      counter_down.classList.add("pulse");

      // show athan notification
      if (Notification.permission === "granted") {
        try {
          new Notification(get_prayer_name(key), {
            icon: "../assets/imgs/logo.png",
          });
        } catch (_) {}
      }

      setTimeout(() => {
        counter_down.classList.remove("pulse");
        if (is_end_of_day()) {
          update_dates_times();
        } else {
          set_next_prayer(get_next_prayer_key(false));
        }
      }, athan_time_out);
    }
  }, 1000);
}

/**
 * get next prayer key
 * @param {boolean} init parameter to check if at first load
 */
function get_next_prayer_key(init = true) {
  if (!init) return curr_prayer_key + 1;

  const entries = [...prayers.entries()];
  let key = 1;
  // get total minutes (hours * 60 + minutes)
  const now_time = new Date();
  const now_min = now_time.getHours() * 60 + now_time.getMinutes();
  let prev_min = -1;

  entries.some((next) => {
    const next_time = next[1].time;
    const next_min = next_time.hr * 60 + next_time.min;

    // console.log("prev:", prev_min, "| now:", now_min, "| next:", next_min);

    if (now_min >= prev_min && now_min <= next_min) {
      key = next[0]; // save the prayer key
      // console.log("yes ✅");
      // console.log(
      //   "curr_prayer_key:",
      //   curr_prayer_key,
      //   "\nnext_prayer_key:",
      //   key
      // );
      return true;
    }
    // console.log("no ❌");
    prev_min = next_min;
    return false;
  });

  return key;
}

/**@param {number} key*/
function set_next_prayer(key) {
  /**@type {HTMLDivElement}*/
  const prayer_times_ele = document.getElementById("prayersTimes");

  if (curr_prayer_key) {
    const curr_prayer_name = prayers.get(curr_prayer_key).name.toLowerCase();
    // remove the picked class from the previous prayer
    prayer_times_ele
      .querySelector(`.${curr_prayer_name}`)
      .classList.remove("picked");
  }
  const next_prayer_name = prayers.get(key).name;
  // add the picked class to the next prayer
  prayer_times_ele
    .querySelector(`.${next_prayer_name.toLowerCase()}`)
    .classList.add("picked");

  /**@type {HTMLDivElement} */
  const prayer_name = document.querySelector(
    ".times > .next-prayer > .prayer-name"
  );

  prayer_name.dataset.en = next_prayer_name;

  if (lang) {
    prayer_name.textContent = next_prayer_name;
  } else {
    prayer_name.textContent = en_ar.get(next_prayer_name);
  }

  set_counter_down(key);
  curr_prayer_key = key;
}

function get_prayer_name(key) {
  const name = prayers.get(key).name;
  return lang ? name : en_ar.get(name);
}

//---------- Month Calendar Page functions ----------
function set_month_year_selections_to_current() {
  const month_sel = document.getElementById("t_sel_month");
  const year_sel = document.getElementById("t_sel_year");
  const now = new Date();
  // select the current month & year
  month_sel.value = now.getMonth() + 1;
  year_sel.value = now.getFullYear();
}

function initiate_month_year_selections() {
  // should call it before setLang() function
  const month_sel = document.getElementById("t_sel_month");
  const year_sel = document.getElementById("t_sel_year");
  const now = new Date();

  months.forEach((m, i) => {
    month_sel.innerHTML += `<option value="${
      i + 1
    }" data-en="${m}">${m}</option>`;
  });

  for (let y = 1980; y < 2051; ++y) {
    year_sel.innerHTML += `<option value="${y}">${y}</option>`;
  }

  // select the current month & year
  month_sel.value = now.getMonth() + 1;
  year_sel.value = now.getFullYear();
}

function build_month_calendar(data) {
  const $days = data.length; // month days count
  const now = new Date();
  const this_day = now.getDate();
  const this_month = now.getMonth() + 1;
  const this_year = now.getFullYear();

  // set the hijri current months & years
  // ====================================================
  const hijri_month_1st = data[0].date.hijri.month.en;
  const hijri_month_2nd = data[$days - 1].date.hijri.month.en;
  // const hijri_month_1st_n = data[0].date.hijri.month.number;
  const hijri_year_1st = data[0].date.hijri.year;
  const hijri_year_2nd = data[$days - 1].date.hijri.year;

  const t_hijri_1st_month = document.querySelector(".t_hijri_1st > .month");
  const t_hijri_2nd_month = document.querySelector(".t_hijri_2nd > .month");
  const t_hijri_1st_year = document.querySelector(".t_hijri_1st > .year");
  const t_hijri_2nd_year = document.querySelector(".t_hijri_2nd > .year");

  // save the month english txt
  t_hijri_1st_month.dataset.en = hijri_month_1st;
  t_hijri_2nd_month.dataset.en = hijri_month_2nd;

  if (lang) {
    t_hijri_1st_month.textContent = hijri_month_1st;
    t_hijri_2nd_month.textContent = hijri_month_2nd;
  } else {
    t_hijri_1st_month.textContent = en_ar.get(hijri_month_1st);
    t_hijri_2nd_month.textContent = en_ar.get(hijri_month_2nd);
  }
  t_hijri_1st_year.textContent = hijri_year_1st;
  t_hijri_2nd_year.textContent = hijri_year_2nd;
  // ====================================================

  // create table
  // ====================================================
  const tbody = document.createElement("tbody");
  const table = document.getElementById("cal_table");
  table.innerHTML = ""; // clear the table

  const set_t_header = (gregorian, hijri) => {
    if (lang) {
      tbody.innerHTML += `
      <tr class="header">
        <th scope="col" class="g-month" data-en="${gregorian}">${gregorian}</th>
        <th scope="col" class="h-month" data-en="${hijri}">${hijri}</th>
        <th scope="col" class="prayer fajr"data-en="Fajr">Fajr</th>
        <th scope="col" class="prayer sunrise" data-en="Sunrise">Sunrise</th>
        <th scope="col" class="prayer dhuhr"data-en="Dhuhr">Dhuhr</th>
        <th scope="col" class="prayer asr"data-en="Asr">Asr</th>
        <th scope="col" class="prayer maghrib" data-en="Maghrib">Maghrib</th>
        <th scope="col" class="prayer isha" data-en="Isha">Isha</th>
      </tr>
      `;
    } else {
      tbody.innerHTML += `
      <tr class="header">
        <th scope="col" class="g-month" data-en="${gregorian}">${en_ar.get(
        gregorian
      )}</th>
        <th scope="col" class="h-month" data-en="${hijri}">${en_ar.get(
        hijri
      )}</th>
        <th scope="col" class="prayer fajr" data-en="Fajr">${en_ar.get(
          "Fajr"
        )}</th>
        <th scope="col" class="prayer sunrise" data-en="Sunrise">${en_ar.get(
          "Sunrise"
        )}</th>
        <th scope="col" class="prayer dhuhr" data-en="Dhuhr">${en_ar.get(
          "Dhuhr"
        )}</th>
        <th scope="col" class="prayer asr" data-en="Asr">${en_ar.get(
          "Asr"
        )}</th>
        <th scope="col" class="prayer maghrib" data-en="Maghrib">${en_ar.get(
          "Maghrib"
        )}</th>
        <th scope="col" class="prayer isha" data-en="Isha">${en_ar.get(
          "Isha"
        )}</th>
      </tr>
      `;
    }
  };

  const gregorian_month = data[0].date.gregorian.month;
  const gregorian_year = +data[0].date.gregorian.year;

  // add the first header
  set_t_header(gregorian_month.en, hijri_month_1st);

  // store the first day hijri month number
  let curr_hijri_month = data[0].date.hijri.month.number;

  data.forEach((day) => {
    // console.log("today:", day);
    const gregorian = day.date.gregorian;
    const hijri = day.date.hijri;
    const timings = day.timings;
    const next_hijri_month = hijri.month.number;

    if (curr_hijri_month !== next_hijri_month) {
      set_t_header(gregorian_month.en, hijri_month_2nd);
    }

    const en_weekday = gregorian.weekday.en.slice(0, 3).toLowerCase();
    const ar_weekday = en_ar.get(en_weekday);
    const g_day = +gregorian.day;
    const h_day = +hijri.day;
    /** @type {string[]} */
    const holidays = hijri.holidays;
    // create a table row
    const tr = document.createElement("tr");
    tr.className = "data";
    tr.dataset.day = g_day;
    tr.tabIndex = 0;

    tr.innerHTML = `
      <th scope="row">
        <span>${g_day}</span> 
        <span data-en="${en_weekday}">${lang ? en_weekday : ar_weekday}</span>
      </th>
      <th scope="row">${h_day}</th>
      <td>${get_time_only(timings.Fajr)}</td>
      <td>${get_time_only(timings.Sunrise)}</td>
      <td>${get_time_only(timings.Dhuhr)}</td>
      <td>${get_time_only(timings.Asr)}</td>
      <td>${get_time_only(timings.Maghrib)}</td>
      <td>${get_time_only(timings.Isha)}</td>
    `;

    // set the holiday if exist
    if (holidays.length) {
      const td = document.createElement("td");
      const holidayTitle = document.createElement("div");
      const holidayDate = document.createElement("div");
      const frag = document.createDocumentFragment();

      tr.classList.add("holiday");
      td.className = "holiday-info";
      holidayTitle.className = "holiday-title";
      holidayTitle.dataset.en = "Holiday";
      holidayTitle.textContent = lang ? "Holiday" : en_ar.get("Holiday");
      holidayDate.className = "holiday-date";

      // add date to the holiday
      [
        [h_day, false],
        [hijri.month.en, true],
        [hijri.year, false],
      ].forEach(([data, isText]) => {
        const div = document.createElement("div");
        if (isText) {
          div.dataset.en = data;
          div.textContent = lang ? data : en_ar.get(data);
        } else {
          div.textContent = data;
        }
        holidayDate.appendChild(div);
      });

      frag.appendChild(holidayTitle);
      frag.appendChild(holidayDate);

      holidays.forEach((holidayName) => {
        const div = document.createElement("div");
        let hd_name = "";

        // some custom holidays for hajj
        if (curr_hijri_month === 12) {
          switch (h_day) {
            case 8:
              hd_name = "At-Tarwiyah";
              break;
            case 9:
            case 10:
              hd_name = holidayName;
              break;
            case 11:
              hd_name = "1st Tashriq Days";
              break;
            case 12:
              hd_name = "2nd Tashriq Days";
              break;
            case 13:
              hd_name = "3rd Tashriq Days";
              break;
          }
        } else {
          hd_name = holidayName;
        }

        div.dataset.en = hd_name;
        div.textContent = lang ? hd_name : en_ar.get(hd_name);
        frag.appendChild(div);
      });

      td.appendChild(frag);
      tr.appendChild(td);

      // add click event listener to the holiday table row
    }
    tbody.appendChild(tr);

    // make the next is the current
    curr_hijri_month = next_hijri_month;
  });

  // highlight this day
  if (this_month === gregorian_month.number && this_year === gregorian_year) {
    tbody.querySelector(`tr[data-day='${this_day}']`).classList.add("today");
  }

  tbody.querySelectorAll("tr.holiday").forEach((tr) => {
    tr.addEventListener("click", (e) => {
      const isOpen = tr.classList.contains("show");
      if (isOpen) {
        if (e.target.matches(".holiday-info")) {
          e.currentTarget.classList.remove("show");
        }
      } else {
        e.currentTarget.classList.add("show");
      }
    });
  });

  // append table body after complete
  table.appendChild(tbody);
  // ====================================================
}

async function update_month_calendar(month, year) {
  const loading = document.getElementById("tableSpinner");
  loading.classList.add("run");
  const data = await fetch_prayers_times(
    coordinates.latitude,
    coordinates.longitude,
    month,
    year
  );
  loading.classList.remove("run");
  if (data) {
    build_month_calendar(data);
    return true;
  }
  show_bad_internet();
  return false;
}

//========================= Events Start =========================
// Pages Btns
function prepare_navigation_switches() {
  page_btn.forEach((btn_id, page_id, map) => {
    const page = document.getElementById(page_id);
    const btn = document.getElementById(btn_id);

    const set_page = () => {
      if (page !== curr_page) {
        page.classList.add("picked");
        curr_page.classList.remove("picked");
        btn.classList.add("picked");
        document
          .getElementById(map.get(curr_page.id))
          .classList.remove("picked");
        curr_page = page;
      }
    };

    btn.addEventListener("click", set_page);
  });
}

function prepare_table_selections() {
  let prev_month = "";
  let prev_year = "";
  const month_sel_ele = document.getElementById("t_sel_month");
  const year_sel_ele = document.getElementById("t_sel_year");

  month_sel_ele.addEventListener("focus", (e) => {
    prev_month = e.target.value;
  });
  year_sel_ele.addEventListener("focus", (e) => {
    prev_year = e.target.value;
  });

  month_sel_ele.addEventListener("change", (e) => {
    const month = +month_sel_ele.value;
    const year = +year_sel_ele.value;
    month_sel_ele.blur();
    update_month_calendar(month, year).then((res) => {
      if (!res) {
        month_sel_ele.value = prev_month;
        console.error("failed to update month");
      }
    });
  });
  year_sel_ele.addEventListener("change", (e) => {
    const month = +month_sel_ele.value;
    const year = +year_sel_ele.value;
    month_sel_ele.blur();
    update_month_calendar(month, year).then((res) => {
      if (!res) {
        year_sel_ele.value = prev_year;
        console.error("failed to update year");
      }
    });
  });
}

function prepare_settings_switches() {
  // settings switches click event
  settings_switches.forEach((action_fun, switch_id) => {
    const _switch = document.getElementById(switch_id);
    _switch.addEventListener("click", action_fun);
  });
}
//========================== Events End ==========================

function set_update_time_interval() {
  setInterval(() => {
    /**@type {HTMLDivElement}*/
    const hr_ele = document.querySelector(".clock > .time > .hr");
    /**@type {HTMLDivElement}*/
    const min_ele = document.querySelector(".clock > .time > .min");
    /**@type {HTMLDivElement}*/
    const sec_ele = document.querySelector(".clock > .time > .sec");

    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();

    // save the value in the data-num attribute
    hr_ele.dataset.num = hrs;
    min_ele.dataset.num = mins;
    sec_ele.dataset.num = secs;

    if (lang) {
      hr_ele.textContent = leading_zero_num_en(hrs);
      min_ele.textContent = leading_zero_num_en(mins);
      sec_ele.textContent = leading_zero_num_en(secs);
    } else {
      hr_ele.textContent = leading_zero_num_ar(to_arabic_number(hrs));
      min_ele.textContent = leading_zero_num_ar(to_arabic_number(mins));
      sec_ele.textContent = leading_zero_num_ar(to_arabic_number(secs));
    }
  }, 1000);
}

function requestnotificationAccess() {
  // notification access request to the user
  document.addEventListener(
    "click",
    (e) => {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    },
    { once: true }
  );
}
