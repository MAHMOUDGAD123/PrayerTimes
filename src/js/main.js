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
const last_page_storage_key = "__prayertimes_last_page__";

let curr_prayer_key = 0;
/**@type {HTMLDivElement}*/
let curr_page = null;
/**@type {{latitude: number, longitude: number} | null} */
let coordinates = read_coordinates();
/**@type {{display_name: string, short_name: string} | null} */
let currentAddress = read_address();

/**@type {Intl.NumberFormat}*/
let globalNumberFormatter = new Intl.NumberFormat("AR-EG", {
  useGrouping: false,
});

/**
 * - English --> true
 * - Arabic ---> false
 */
let isEnglish = read_lang();

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

const prayers_and_times = new Map([
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
      s_time: "23:59",
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
  return curr_prayer_key >= prayers_and_times.size;
}

/**@param {string} text*/
function translate_text(text) {
  return isEnglish ? text : en_ar.get(text);
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

function save_coordinates() {
  _Storage.save(coords_storage_key, coordinates, "localStorage");
}

/**@returns {{latitude: number, longitude: number} | null}*/
function read_coordinates() {
  return _Storage.read(coords_storage_key, "localStorage");
}

function save_lang() {
  _Storage.save(lang_storage_key, !!isEnglish, "localStorage");
}

/**@returns {boolean | null}*/
function read_lang() {
  return _Storage.read(lang_storage_key, "localStorage");
}

function save_address() {
  _Storage.save(address_storage_key, currentAddress, "localStorage");
}

/**@returns {{display_name: string, short_name: string} | null}*/
function read_address() {
  return _Storage.read(address_storage_key, "localStorage");
}

/**@param {string} page_id*/
function save_last_page(page_id) {
  _Storage.save(last_page_storage_key, page_id, "localStorage");
}

/**@returns {string | null}*/
function read_last_page() {
  return _Storage.read(last_page_storage_key, "localStorage");
}

//===================== Data & tools End ======================

//===================== initialization Start ======================
// set the initial page
curr_page = document.getElementById(read_last_page() ?? "prayerTimesPage");
curr_page.classList.add("picked");
document.getElementById(page_btn.get(curr_page.id)).classList.add("picked");
// set month calendar page selections
initiate_month_year_selections();
set_lang();

(async () => {
  if (await app_initiate()) {
    prepare_table_selections();
    prepare_settings_switches();
    set_update_time_interval();
    prepare_navigation_switches();
    hide_app_loader_screen();
    request_notification_access();
  } else {
    show_app_error_screen();
  }
})();

/**
 * @param {boolean} update force update
 */
async function app_initiate(update = false) {
  try {
    if (update || !coordinates) {
      coordinates = await fetch_geolocation();
      save_coordinates();
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

    if (!update && currentAddress) {
      set_location();
    } else {  
      currentAddress = await fetch_address(latitude, longitude);
      if (!currentAddress) {
        throw new Error("Faild To Get Your Address 🟥");
      }
      set_location();
      save_address();
    }
    return true;
  } catch (error) {
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

  // toggle the language
  // if isEnglish is true then switch to Arabic
  if (isEnglish) {
    _switch.classList.add("on");
    document.body.classList.add("ar");
    logo.classList.add("ar");

    // set text
    all_txt.forEach((ele) => {
      const en_txt = ele.dataset.en;
      ele.textContent = en_ar.get(en_txt);
    });

    // set numbers
    all_nums.forEach((ele) => {
      const no_leading_zero = ele.hasAttribute("data-no-leading-zero");
      const num = to_arabic_number(+ele.dataset.num);
      ele.textContent = no_leading_zero ? num : leading_zero_num_ar(num);
    });
  } else {
    _switch.classList.remove("on");
    document.body.classList.remove("ar");
    logo.classList.remove("ar");

    all_txt.forEach((ele) => {
      const en_txt = ele.dataset.en;
      ele.textContent = en_txt;
    });

    // set numbers
    all_nums.forEach((ele) => {
      const no_leading_zero = ele.hasAttribute("data-no-leading-zero");
      const num = +ele.dataset.num;
      ele.textContent = no_leading_zero ? num : leading_zero_num_en(num);
    });
  }
  // save the language state and toggle it
  save_lang();
  isEnglish = !isEnglish;
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
  setTimeout(() => {
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
  }, 1500);
}

function show_app_error_screen() {
  setTimeout(() => {
    /**@type {HTMLDivElement}*/
    const appLoaderScreen = document.getElementById("appLoaderScreen");
    /**@type {HTMLElement}*/
    const header = document.querySelector("header");
    /**@type {HTMLDivElement}*/
    const appErrorScreen = document.getElementById("appErrorScreen");

    // shrink the loading screen to free space to the logo
    appLoaderScreen.classList.add("shrink");
    // move logo to the top of the screen
    header.classList.remove("loading");
    // show error screen
    appErrorScreen.showPopover();

    setTimeout(() => {
      // remove the loading screen and the header spinner
      appLoaderScreen.remove();
      header.querySelector(".spinner").remove();
    }, 500);
  }, 1500);
}

function show_app_fetch_error_popup() {
  /**@type {HTMLDivElement}*/
  const appErrorScreen = document.getElementById("appErrorScreen");
  // show error popup
  appErrorScreen.showPopover();
}

/**
 * activate or stop the loading state
 * @param {"add" | "remove"} action
 */
function location_loading_state(action) {
  /**@type {HTMLLegendElement} */
  const locationLegend = document.getElementById("locationLegend");
  locationLegend.classList[action]("loading");
}

/**
 * @param {boolean} enable
 * @description enable or disable the update location switch
 */
function toggle_update_location_switch(enable) {
  /**@type {HTMLButtonElement} */
  const updateLocationSwitch = document.getElementById("updateLocationSwitch");
  updateLocationSwitch.disabled = enable;
}

/**@param {boolean} success*/
function print_location_fetch_result(success) {
  /**@type {HTMLLegendElement} */
  const locationLegend = document.getElementById("locationLegend");
  /**@type {HTMLParagraphElement} */
  const locationUpdateMsg = document.getElementById("locationUpdateMsg");
  const result = success ? "success" : "faild";
  locationLegend.classList.add(result);
  const english_msg = success
    ? "Location Updated Successfully"
    : "Faild To Update Location";
  locationUpdateMsg.dataset.en = english_msg;
  const potentially_translated_msg = translate_text(english_msg);
  locationUpdateMsg.textContent = potentially_translated_msg;
  locationUpdateMsg.classList.add("show");
  setTimeout(() => {
    locationLegend.classList.remove(result);
    locationUpdateMsg.classList.remove("show");
    toggle_update_location_switch(false);
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
  toggle_update_location_switch(true);
  location_loading_state("add");
  const update_success = await app_initiate(true);
  if (update_success) {
    // reset the calendar selections to the current month & year
    set_month_year_selections_to_current();
  }
  print_location_fetch_result(update_success);
  location_loading_state("remove");
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
    // show_bad_internet();
    show_app_fetch_error_popup();
  }
}

/**
 * set dates & times
 * @param {{
 * date: { readable: string, timestamp: string, gregorian: { date: string, format: string, day: string, weekday: { en: string }, month: { number: number, en: string }, year: string, designation: { abbreviated: string, expanded: string }, lunarSighting: boolean }, hijri: { date: string, format: string, day: string, weekday: { en: string, ar: string }, month: { number: number, en: string, ar: string, days: number }, year: string, designation: { abbreviated: string, expanded: string }, holidays: string[], adjustedHolidays: string[], method: string } },
 * meta: { latitude: number, longitude: number, timezone: string, method: { id: number, name: string, params: { Fajr: number, Isha: number }, location: { latitude: number, longitude: number } }, latitudeAdjustmentMethod: string, midnightMode: string, school: string, offset: { Imsak: number, Fajr: number, Sunrise: number, Dhuhr: number, Asr: number, Maghrib: number, Sunset: number, Isha: number, Midnight: number } },
 * timings: { Fajr: string, Sunrise: string, Dhuhr: string, Asr: string, Sunset: string, Maghrib: string, Isha: string, Imsak: string, Midnight: string, Firstthird: string, Lastthird: string }
 * }} _today all the data for today
 */
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

  if (isEnglish) {
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
  for (let i = 1, len = prayers_and_times.size; i < len; ++i) {
    // save data in the map
    const prayer = prayers_and_times.get(i);
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
    if (isEnglish) {
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
  midnight_time_hr_ele.dataset.num = 23;
  midnight_time_min_ele.dataset.num = 59;
  // print the values
  if (isEnglish) {
    midnight_time_hr_ele.textContent = "23";
    midnight_time_min_ele.textContent = "59";
  } else {
    midnight_time_hr_ele.textContent = "۲۳";
    midnight_time_min_ele.textContent = "۵۹";
  }
}

// prayer counter down
function set_counter_down(key) {
  const untill = new Date();
  const curr_prayer_time = prayers_and_times.get(key).time;
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

    const hrs = Math.floor(diff / ms_hr);
    const mins = Math.floor((diff % ms_hr) / ms_min);
    const secs = Math.floor((diff % ms_min) / ms_sec);

    // save the value in the data-num attribute
    hr_ele.dataset.num = hrs;
    min_ele.dataset.num = mins;
    sec_ele.dataset.num = secs;

    if (isEnglish) {
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

      // save zero in the data-num attribute
      hr_ele.dataset.num = 0;
      min_ele.dataset.num = 0;
      sec_ele.dataset.num = 0;

      hr_ele.textContent = isEnglish ? "00" : "۰۰";
      min_ele.textContent = isEnglish ? "00" : "۰۰";
      sec_ele.textContent = isEnglish ? "00" : "۰۰";

      const counter_down = document.querySelector(
        ".times > .next-prayer > .counter-down"
      );
      counter_down.classList.add("pulse");

      // show athan notification
      if (Notification.permission === "granted") {
        try {
          const prayer_name = get_prayer_name(key);
          const notificationTitle = isEnglish
            ? prayer_name
            : en_ar.get(prayer_name);
          new Notification(notificationTitle, {
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

  const entries = [...prayers_and_times.entries()];
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

/**
 * @param {number} key the parayer key
 * @description get the prayer name by key
 */
function get_prayer_name(key) {
  return prayers_and_times.get(key).name;
}

/**@param {number} key*/
function set_next_prayer(key) {
  /**@type {HTMLDivElement}*/
  const prayer_times_ele = document.getElementById("prayersTimes");

  if (curr_prayer_key) {
    const curr_prayer_name = get_prayer_name(curr_prayer_key).toLowerCase();
    // remove the picked class from the previous prayer
    prayer_times_ele
      .querySelector(`.${curr_prayer_name}`)
      .classList.remove("picked");
  }
  const next_prayer_name = get_prayer_name(key);
  // add the picked class to the next prayer
  prayer_times_ele
    .querySelector(`.${next_prayer_name.toLowerCase()}`)
    .classList.add("picked");

  /**@type {HTMLDivElement} */
  const prayer_name = document.querySelector(
    ".times > .next-prayer > .prayer-name"
  );

  prayer_name.dataset.en = next_prayer_name;

  if (isEnglish) {
    prayer_name.textContent = next_prayer_name;
  } else {
    prayer_name.textContent = en_ar.get(next_prayer_name);
  }

  set_counter_down(key);
  curr_prayer_key = key;
}

//---------- Month Calendar Page functions ----------
function set_month_year_selections_to_current() {
  const month_sel_ele = document.getElementById("t_sel_month");
  const year_sel_ele = document.getElementById("t_sel_year");
  const now = new Date();
  // select the current month & year
  month_sel_ele.value = now.getMonth() + 1;
  year_sel_ele.value = now.getFullYear();
}

function initiate_month_year_selections() {
  // should call it before setLang() function
  const month_sel_ele = document.getElementById("t_sel_month");
  const year_sel_ele = document.getElementById("t_sel_year");
  const now = new Date();

  // create the selections options
  months.forEach((month_name, i) => {
    const option_ele = document.createElement("option");
    // save the month number
    option_ele.dataset.en = month_name;
    option_ele.value = i + 1;
    month_sel_ele.appendChild(option_ele);
  });

  for (let year = 1980; year < 2051; ++year) {
    const option_ele = document.createElement("option");
    // save the year number
    option_ele.dataset.num = year;
    option_ele.value = year;
    year_sel_ele.appendChild(option_ele);
  }

  // select the current month & year
  month_sel_ele.value = now.getMonth() + 1;
  year_sel_ele.value = now.getFullYear();
}

/**
 * this function will build the calendar table
 * @param {{
 * date: { readable: string, timestamp: string, gregorian: { date: string, format: string, day: string, weekday: { en: string }, month: { number: number, en: string }, year: string, designation: { abbreviated: string, expanded: string }, lunarSighting: boolean }, hijri: { date: string, format: string, day: string, weekday: { en: string, ar: string }, month: { number: number, en: string, ar: string, days: number }, year: string, designation: { abbreviated: string, expanded: string }, holidays: string[], adjustedHolidays: string[], method: string } },
 * meta: { latitude: number, longitude: number, timezone: string, method: { id: number, name: string, params: { Fajr: number, Isha: number }, location: { latitude: number, longitude: number } }, latitudeAdjustmentMethod: string, midnightMode: string, school: string, offset: { Imsak: number, Fajr: number, Sunrise: number, Dhuhr: number, Asr: number, Maghrib: number, Sunset: number, Isha: number, Midnight: number } },
 * timings: { Fajr: string, Sunrise: string, Dhuhr: string, Asr: string, Sunset: string, Maghrib: string, Isha: string, Imsak: string, Midnight: string, Firstthird: string, Lastthird: string }
 * }[]} data all the api data for the month
 */
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

  /**@type {HTMLDivElement}*/
  const t_hijri_1st_month_ele = document.querySelector(".t_hijri_1st > .month");
  /**@type {HTMLDivElement}*/
  const t_hijri_2nd_month_ele = document.querySelector(".t_hijri_2nd > .month");
  /**@type {HTMLDivElement}*/
  const t_hijri_1st_year_ele = document.querySelector(".t_hijri_1st > .year");
  /**@type {HTMLDivElement}*/
  const t_hijri_2nd_year_ele = document.querySelector(".t_hijri_2nd > .year");

  // save the month english txt
  t_hijri_1st_month_ele.dataset.en = hijri_month_1st;
  t_hijri_2nd_month_ele.dataset.en = hijri_month_2nd;
  // save the year number
  t_hijri_1st_year_ele.dataset.num = hijri_year_1st;
  t_hijri_2nd_year_ele.dataset.num = hijri_year_2nd;

  // print the data
  if (isEnglish) {
    t_hijri_1st_month_ele.textContent = hijri_month_1st;
    t_hijri_2nd_month_ele.textContent = hijri_month_2nd;
    t_hijri_1st_year_ele.textContent = hijri_year_1st;
    t_hijri_2nd_year_ele.textContent = hijri_year_2nd;
  } else {
    t_hijri_1st_month_ele.textContent = en_ar.get(hijri_month_1st);
    t_hijri_2nd_month_ele.textContent = en_ar.get(hijri_month_2nd);
    t_hijri_1st_year_ele.textContent = to_arabic_number(hijri_year_1st);
    t_hijri_2nd_year_ele.textContent = to_arabic_number(hijri_year_2nd);
  }

  // ====================================================

  // create table
  // ====================================================
  const tbody = document.createElement("tbody");
  /**@type {HTMLTableElement}*/
  const table = document.getElementById("cal_table");
  table.innerHTML = ""; // clear the table

  // get the formatter functions based on the language
  // --------------------------------------------------------------
  /**@type {(txt: string) => string} */
  const txt_formatter = isEnglish ? (txt) => txt : (txt) => en_ar.get(txt);
  /**@type {(n: number) => string} */
  const num_formatter = isEnglish
    ? (n) => leading_zero_num_en(n)
    : (n) => leading_zero_num_ar(to_arabic_number(n));
  // --------------------------------------------------------------

  /**
   * @param {string} gregorian gregorian month name
   * @param {string} hijri hijri month name
   * @description set the table header
   */
  const set_t_header = (gregorian, hijri) => {
    tbody.innerHTML += `
      <tr class="header">
        <th scope="col" class="g-month" data-en="${gregorian}">${txt_formatter(
      gregorian
    )}</th>
        <th scope="col" class="h-month" data-en="${hijri}">${txt_formatter(
      hijri
    )}</th>
        <th scope="col" class="prayer fajr" data-en="Fajr">${txt_formatter(
          "Fajr"
        )}</th>
        <th scope="col" class="prayer sunrise" data-en="Sunrise">${txt_formatter(
          "Sunrise"
        )}</th>
        <th scope="col" class="prayer dhuhr" data-en="Dhuhr">${txt_formatter(
          "Dhuhr"
        )}</th>
        <th scope="col" class="prayer asr" data-en="Asr">${txt_formatter(
          "Asr"
        )}</th>
        <th scope="col" class="prayer maghrib" data-en="Maghrib">${txt_formatter(
          "Maghrib"
        )}</th>
        <th scope="col" class="prayer isha" data-en="Isha">${txt_formatter(
          "Isha"
        )}</th>
      </tr>
      `;
  };

  /**
   * @param {string} time
   * @description get the hours and minutes from the time
   * @returns {{hr: number, min: number}} the hours and minutes
   */
  const parse_time = (time) => {
    const [hr, min] = get_time_only(time).split(":");
    return { hr: +hr, min: +min };
  };

  const gregorian_month = data[0].date.gregorian.month;
  const gregorian_year = +data[0].date.gregorian.year;

  // add the first header
  set_t_header(gregorian_month.en, hijri_month_1st);

  // store the first day hijri month number
  let curr_hijri_month = data[0].date.hijri.month.number;

  data.forEach((day) => {
    const gregorian = day.date.gregorian;
    const hijri = day.date.hijri;
    const timings = day.timings;
    const next_hijri_month = hijri.month.number;

    if (curr_hijri_month !== next_hijri_month) {
      set_t_header(gregorian_month.en, hijri_month_2nd);
    }

    const en_weekday = gregorian.weekday.en.slice(0, 3).toLowerCase();
    const g_day = +gregorian.day;
    const h_day = +hijri.day;
    /** @type {string[]} */
    const holidays = hijri.holidays;
    // create a table row
    const tr = document.createElement("tr");
    tr.className = "data";
    tr.dataset.day = g_day;
    tr.tabIndex = 0;

    const hr_min = {
      fajr: parse_time(timings.Fajr),
      sunrise: parse_time(timings.Sunrise),
      dhuhr: parse_time(timings.Dhuhr),
      asr: parse_time(timings.Asr),
      maghrib: parse_time(timings.Maghrib),
      isha: parse_time(timings.Isha),
    };

    // build the table row
    tr.innerHTML = `
      <th scope="row">
        <span data-num="${g_day}" data-no-leading-zero>${
      isEnglish ? g_day : to_arabic_number(g_day)
    }</span> 
        <span data-en="${en_weekday}">${txt_formatter(en_weekday)}</span>
      </th>
      <th scope="row" data-num="${h_day}" data-no-leading-zero>${
      isEnglish ? h_day : to_arabic_number(h_day)
    }</th>
      <td>
        <div class="holder">
          <span data-num="${hr_min.fajr.hr}">${num_formatter(
      hr_min.fajr.hr
    )}</span>
          <span>:</span>
          <span data-num="${hr_min.fajr.min}">${num_formatter(
      hr_min.fajr.min
    )}</span>
        </div>
      </td>
      <td>
        <div class="holder">
          <span data-num="${hr_min.sunrise.hr}">${num_formatter(
      hr_min.sunrise.hr
    )}</span>
          <span>:</span>
          <span data-num="${hr_min.sunrise.min}">${num_formatter(
      hr_min.sunrise.min
    )}</span>
        </div>
      </td>
      <td>
        <div class="holder">
          <span data-num="${hr_min.dhuhr.hr}">${num_formatter(
      hr_min.dhuhr.hr
    )}</span>
          <span>:</span>
          <span data-num="${hr_min.dhuhr.min}">${num_formatter(
      hr_min.dhuhr.min
    )}</span>
        </div>
      </td>
      <td>
        <div class="holder">
          <span data-num="${hr_min.asr.hr}">${num_formatter(
      hr_min.asr.hr
    )}</span>
          <span>:</span>
          <span data-num="${hr_min.asr.min}">${num_formatter(
      hr_min.asr.min
    )}</span>
        </div>
      </td>
      <td>
        <div class="holder">
          <span data-num="${hr_min.maghrib.hr}">${num_formatter(
      hr_min.maghrib.hr
    )}</span>
          <span>:</span>
          <span data-num="${hr_min.maghrib.min}">${num_formatter(
      hr_min.maghrib.min
    )}</span>
        </div>
      </td>
      <td>
        <div class="holder">
          <span data-num="${hr_min.isha.hr}">${num_formatter(
      hr_min.isha.hr
    )}</span>
          <span>:</span>
          <span data-num="${hr_min.isha.min}">${num_formatter(
      hr_min.isha.min
    )}</span>
        </div>
    </td>
    `;

    // set the holiday if exist
    if (holidays.length) {
      const td = document.createElement("td");
      const holidayTitle = document.createElement("div");
      const holidayDate = document.createElement("div");
      const frag = document.createDocumentFragment();

      // close button
      const closeBtn = document.createElement("button");
      const xIcon = document.createElement("i");
      xIcon.className = "fa-solid fa-xmark";
      closeBtn.className = "close-btn";
      closeBtn.appendChild(xIcon);

      tr.classList.add("holiday");
      td.className = "holiday-info popup";
      td.setAttribute("popover", "");
      holidayTitle.className = "holiday-title";
      holidayTitle.dataset.en = "Holiday";
      holidayTitle.textContent = txt_formatter("Holiday");
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
          div.textContent = txt_formatter(data);
        } else {
          div.textContent = isEnglish ? data : to_arabic_number(data);
          div.dataset.num = data;
          div.dataset.noLeadingZero = true;
        }
        holidayDate.appendChild(div);
      });

      frag.appendChild(closeBtn);
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
          hd_name = holidayName.trim();
        }

        div.dataset.en = hd_name;
        div.textContent = txt_formatter(hd_name);
        frag.appendChild(div);
      });

      td.appendChild(frag);
      tr.appendChild(td);
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
    /**@type {HTMLTableRowElement} */
    const table_row = tr;
    /**@type {HTMLTableCellElement} */
    const info_popover = table_row.querySelector(".popup");
    const close_btn = info_popover.querySelector(".close-btn");

    close_btn.popoverTargetElement = info_popover;
    close_btn.popoverTargetAction = "hide";

    table_row.addEventListener("click", () => {
      info_popover.showPopover();
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
  // show_bad_internet();
  show_app_fetch_error_popup();
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
        // show the new page
        page.classList.add("picked");
        // deactivate the current button
        curr_page.classList.remove("picked");
        // activate the new button
        btn.classList.add("picked");
        // hide the current page
        document
          .getElementById(map.get(curr_page.id))
          .classList.remove("picked");
        // save the new page reference
        curr_page = page;
        save_last_page(curr_page.id);
      }
    };

    btn.addEventListener("click", set_page);
  });
}

function prepare_table_selections() {
  let prev_month = "";
  let prev_year = "";
  /**@type {HTMLSelectElement} */
  const month_sel_ele = document.getElementById("t_sel_month");
  /**@type {HTMLSelectElement} */
  const year_sel_ele = document.getElementById("t_sel_year");

  month_sel_ele.addEventListener("focus", (e) => {
    // save the previous option to revert back if faild
    prev_month = e.target.value;
  });
  year_sel_ele.addEventListener("focus", (e) => {
    // save the previous option to revert back if faild
    prev_year = e.target.value;
  });

  month_sel_ele.addEventListener("change", (e) => {
    const month = +month_sel_ele.value;
    const year = +year_sel_ele.value;
    month_sel_ele.blur();
    update_month_calendar(month, year).then((res) => {
      if (!res) {
        // roll back
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
        // roll back
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

    if (isEnglish) {
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

function request_notification_access() {
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
