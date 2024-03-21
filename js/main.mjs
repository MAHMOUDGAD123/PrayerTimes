//=================== Dependances Start ====================
import { api } from "./api.mjs";
import { frmt_time } from "./time.mjs";
//==================== Dependances End =====================

//==================== Data & tools Start =====================
let run = true;
let curr_prayer_key = 0;
let curr_page = null;

// page_btn_id => page_id
const page_btn = new Map([
  ["prayerTimesPage", "prayer_times_btn"],
  ["monthCalendarPage", "month_cal_btn"],
  // ["settingsPage", "settings_btn"],
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
      name: "Fajr",
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
      name: "Sunrise",
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
      name: "Dhuhr",
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
      name: "Asr",
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
      name: "Maghrib",
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
      name: "Isha",
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
      name: "Midnight",
      s_time: "00:00",
      time: {
        hr: 24,
        min: 0,
      },
    },
  ],
]);

const get_time_only = (time) => {
  return time.slice(0, 5);
};

const get_hr_min = (time) => {
  const hr = +time.slice(0, 2);
  const min = +time.slice(3, 5);
  return [hr, min];
};

const end_of_day = () => {
  return curr_prayer_key >= prayers.size;
};

const is_prayer = () => {
  return curr_prayer_key !== 2 && curr_prayer_key !== 7;
};

const bad_internet = () => {
  const bad_net_icon = curr_page.querySelector("i.bad-net");
  bad_net_icon.style.display = "block";

  setTimeout(() => {
    bad_net_icon.style.display = "none";
  }, 2500);
};
//===================== Data & tools End ======================

//===================== initialization & testing Start ======================
// set the initial page
curr_page = document.getElementById("prayerTimesPage");
curr_page.style.display = "flex";
document.getElementById(page_btn.get(curr_page.id)).classList.add("picked");
// set month calendar page selections
set_month_year_selections();

// data init
if (run) {
  // get data from api
  const { data, address } = await api();

  // console.log("Data:", data);
  // console.log("Address:", address);

  // do nothing if null
  if (data) {
    // Prayer Times Page
    const _today = data[new Date().getDate() - 1];
    set_times_dates(_today);
    const next_prayer_key = get_next_prayer_key();
    set_next_prayer(next_prayer_key);
    if (address) {
      // add the location
      const address_ele = document.getElementById("city_country");
      address_ele.textContent = `${address.city} - ${address.country}`;
      // Month Calendar Page
      set_month_calendar(data);
    }
  } else {
    bad_internet();
  }
}
//====================== initialization & testing End =======================

//========================= Functions Start =========================
//---------- prayer Times Page ----------
const update_dates_times = async () => {
  // use this function to update the (dates & times) at the end of the day
  // get data from api
  const { data } = await api(true);

  // do nothing if null
  if (data) {
    const _today = data[new Date().getDate() - 1];
    set_times_dates(_today);
    set_next_prayer(1);
  } else {
    bad_internet();
  }
};

// set dates & times
function set_times_dates(_today) {
  const gregorian = _today.date.gregorian;
  const hijri = _today.date.hijri;
  const timings = _today.timings;

  // save_times except midnight
  for (let i = 1, len = prayers.size; i < len; ++i) {
    const prayer = prayers.get(i);
    const time = timings[`${prayer.name}`];
    const [hr, min] = get_hr_min(time);
    prayer.s_time = get_time_only(time);
    prayer.time.hr = hr;
    prayer.time.min = min;
  }

  // weekday
  document.getElementById("today").textContent = gregorian.weekday.en;

  // dates
  document.querySelector(".day > .hijri").textContent = hijri.day;
  document.querySelector(".day > .melady").textContent = gregorian.day;
  document.querySelector(".month > .hijri").textContent = hijri.month.en;
  document.querySelector(".month > .melady").textContent = gregorian.month.en;
  document.querySelector(".year > .hijri").textContent = hijri.year;
  document.querySelector(".year > .melady").textContent = gregorian.year;

  // times
  document.querySelector(".prayers > .fajr > .time").textContent = `${
    prayers.get(1).s_time
  }`;

  document.querySelector(".prayers > .sunrise > .time").textContent = `${
    prayers.get(2).s_time
  }`;

  document.querySelector(".prayers > .dhuhr > .time").textContent = `${
    prayers.get(3).s_time
  }`;

  document.querySelector(".prayers > .asr > .time").textContent = `${
    prayers.get(4).s_time
  }`;

  document.querySelector(".prayers > .maghrib > .time").textContent = `${
    prayers.get(5).s_time
  }`;

  document.querySelector(".prayers > .isha > .time").textContent = `${
    prayers.get(6).s_time
  }`;

  document.querySelector(".prayers > .midnight > .time").textContent = `${
    prayers.get(7).s_time
  }`;
}

// prayer counter down
function set_counter_down(key) {
  const untill = new Date();
  const curr_prayer_time = prayers.get(key).time;
  const hr = curr_prayer_time.hr;
  const min = curr_prayer_time.min;
  untill.setHours(hr, min);

  const h = document.querySelector(".counter-down > .hr");
  const m = document.querySelector(".counter-down > .min");
  const s = document.querySelector(".counter-down > .sec");

  const ms_hr = 1000 * 60 * 60;
  const ms_min = 1000 * 60;
  const ms_sec = 1000;

  // count down interval
  const intervId = setInterval(() => {
    const now = Date.now();
    const dif = untill - now;

    const hrs = Math.floor(dif / ms_hr);
    const mins = Math.floor((dif % ms_hr) / ms_min);
    const secs = Math.floor((dif % ms_min) / ms_sec);

    h.textContent = frmt_time(hrs);
    m.textContent = frmt_time(mins);
    s.textContent = frmt_time(secs);

    if (dif <= 0) {
      clearInterval(intervId);
      let athan_time_out = 60000;

      h.textContent = "00";
      m.textContent = "00";
      s.textContent = "00";

      const counter_down = document.querySelector(
        ".times > .next-prayer > .counter-down"
      );

      counter_down.classList.add("blink");

      if (is_prayer()) {
        const athan = document.getElementById("athan");
        athan_time_out = Math.ceil(athan.duration * 1000);
        athan.play();

        setTimeout(() => {
          counter_down.classList.remove("blink");
          athan.pause();
          athan.currentTime = 0;

          if (end_of_day()) {
            update_dates_times();
          } else {
            set_next_prayer(get_next_prayer_key(false));
          }
        }, athan_time_out);
      } else {
        setTimeout(() => {
          counter_down.classList.remove("blink");

          if (end_of_day()) {
            update_dates_times();
          } else {
            set_next_prayer(get_next_prayer_key(false));
          }
        }, athan_time_out);
      }
    }
  }, 1000);
}

// get next prayer key
// (init) parameter to check if at first load
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

function set_next_prayer(key) {
  const prayers_list = document.querySelectorAll(".times > .prayers > .prayer");

  if (curr_prayer_key)
    prayers_list[curr_prayer_key - 1].classList.remove("picked");

  prayers_list[key - 1].classList.add("picked");

  document.querySelector(".times > .next-prayer > .prayer-name").textContent =
    prayers.get(key).name;

  set_counter_down(key);
  curr_prayer_key = key;
}

//---------- Month Calendar Page ----------
function set_month_year_selections() {
  const month_sel = document.getElementById("t_sel_month");
  const year_sel = document.getElementById("t_sel_year");
  const now = new Date();
  months.forEach((m, i) => {
    month_sel.innerHTML += `<option value="${i + 1}" label="${m}"></option>`;
  });

  for (let s = 1980; s < 2051; ++s) {
    year_sel.innerHTML += `<option value="${s}" label="${s}"></option>`;
  }
  // select the current month & year
  month_sel.querySelector(
    `option[value="${now.getMonth() + 1}"]`
  ).selected = true;
  year_sel.querySelector(
    `option[value="${now.getFullYear()}"]`
  ).selected = true;
}

function set_month_calendar(data) {
  const $days = data.length; // month days count
  const now = new Date();
  const this_day = now.getDate();
  const this_month = now.getMonth() + 1;
  const this_year = now.getFullYear();

  // set the hijri current months & years
  // ====================================================
  const hijri_month_1st = data[0].date.hijri.month.en;
  const hijri_month_2nd = data[$days - 1].date.hijri.month.en;
  const hijri_year_1st = data[0].date.hijri.year;
  const hijri_year_2nd = data[$days - 1].date.hijri.year;
  document.getElementById("t_hijri_1st").textContent =
    hijri_month_1st + " " + hijri_year_1st;
  document.getElementById("t_hijri_2nd").textContent =
    hijri_month_2nd + " " + hijri_year_2nd;
  // ====================================================

  // create table
  // ====================================================
  const tbody = document.createElement("tbody");
  const table = document.getElementById("cal_table");
  table.innerHTML = ""; // clear the table

  const set_t_header = (gregorian, hijri) => {
    tbody.innerHTML += `
    <tr class="header">
      <th scope="col" class="g-month">${gregorian}</th>
      <th scope="col" class="h-month">${hijri}</th>
      <th scope="col" class="prayer fajr">Fajr</th>
      <th scope="col" class="prayer sunrise">Sunrise</th>
      <th scope="col" class="prayer dhuhr">Dhuhr</th>
      <th scope="col" class="prayer asr">Asr</th>
      <th scope="col" class="prayer maghrib">Maghrib</th>
      <th scope="col" class="prayer isha">Isha</th>
    </tr>
    `;
  };

  const gregorian_month = data[0].date.gregorian.month;
  const gregorian_year = +data[0].date.gregorian.year;
  // add the first header
  set_t_header(gregorian_month.en, hijri_month_1st);

  // store the first day hijgri month number
  let curr_hijri_month = data[0].date.hijri.month.number;

  data.forEach((day, i) => {
    const gregorian = day.date.gregorian;
    const hijri = day.date.hijri;
    const timings = day.timings;
    const next_hijri_month = hijri.month.number;

    if (curr_hijri_month !== next_hijri_month) {
      set_t_header(gregorian_month.en, hijri_month_2nd);
    }
    const weekday = gregorian.weekday.en.slice(0, 3).toLowerCase();
    const g_day = +gregorian.day;
    tbody.innerHTML += `
        <tr class="data" data-day="${g_day}">
          <th scope="row">${g_day} ${weekday}</th>
          <th scope="row">${+hijri.day}</th>
          <td>${get_time_only(timings.Fajr)}</td>
          <td>${get_time_only(timings.Sunrise)}</td>
          <td>${get_time_only(timings.Dhuhr)}</td>
          <td>${get_time_only(timings.Asr)}</td>
          <td>${get_time_only(timings.Maghrib)}</td>
          <td>${get_time_only(timings.Isha)}</td>
        </tr>`;
    // make the next is the current
    curr_hijri_month = next_hijri_month;
  });
  // highlight this day
  if (this_month === gregorian_month.number && this_year === gregorian_year) {
    tbody.querySelector(`tr[data-day='${this_day}']`).classList = "today";
  }
  // append table body after complete
  table.appendChild(tbody);
  // ====================================================
}

async function update_month_calendar(month, year) {
  const loading = document.getElementById("loading");
  loading.style.opacity = 1;
  const { data } = await api(true, month, year);
  loading.style.opacity = 0;
  // console.log("Data:", data);
  if (data) {
    set_month_calendar(data);
  } else {
    bad_internet();
  }
}
//========================= Functions End =========================

//========================= Events Start =========================
// Pages Btns
page_btn.forEach((btn_id, page_id, map) => {
  const page = document.getElementById(page_id);
  const btn = document.getElementById(btn_id);

  const set_page = () => {
    if (page !== curr_page) {
      page.style.display = "flex";
      curr_page.style.display = "none";
      btn.classList.add("picked");
      document.getElementById(map.get(curr_page.id)).classList.remove("picked");
      curr_page = page;
    }
  };

  btn.addEventListener("click", () => {
    set_page();
  });

  btn.addEventListener("keydown", (e) => {
    if (e.code === "Enter" || e.code === "Space") {
      set_page();
    }
  });
});

// table selections
document.getElementById("t_sel_month").addEventListener("input", (e) => {
  const month = +e.target.value;
  // console.log("Month:", month);
  update_month_calendar(month, 0);
});
document.getElementById("t_sel_year").addEventListener("input", (e) => {
  const year = +e.target.value;
  // console.log("Year:", year);
  update_month_calendar(0, year);
});
//========================== Events End ==========================
