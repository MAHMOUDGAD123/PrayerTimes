/* Time Start */
export const frmt_time = (n) => {
  if (!n) return "00";
  return Math.floor(Math.log10(n)) ? n : "0" + n;
};

const hours = document.querySelector(".clock > .time > .hr");
const minutes = document.querySelector(".clock > .time > .min");
const seconds = document.querySelector(".clock > .time > .sec");

setInterval(() => {
  const D = new Date();
  const hrs = frmt_time(D.getHours());
  const mins = frmt_time(D.getMinutes());
  const secs = frmt_time(D.getSeconds());

  hours.textContent = hrs;
  minutes.textContent = mins;
  seconds.textContent = secs;
}, 1000);

/* Time End */
