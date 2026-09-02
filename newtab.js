const clock = document.getElementById("clock");

function formatTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function tick() {
  clock.textContent = formatTime(new Date());
}

tick();
setInterval(tick, 1000);
