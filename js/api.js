const get_location = async (lat, lng) => {
  const key = "65f288a00d129207874014qnh3d03c5";
  const url = `https://geocode.maps.co/reverse?lat=${lat}&lon=${lng}&api_key=${key}`;
  const req = new Request(url, { method: "GET" });
  const res = await fetch(req);
  if (!res.ok) {
    console.log("Fetch Location ❌");
    return null;
  }
  console.log("Fetch Locaiton ✅");
  const address = await res.json();
  return address;
};

const get_weather = async (lat, lng) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m`;
  const req = new Request(url, { method: "GET" });
  const res = await fetch(req);
  if (!res.ok) {
    console.log("Fetch Weather ❌");
    return null;
  }
  console.log("Fetch Weather ✅");
  const address = await res.json();
  return address;
};

// athan - location - weather
export const api = (time_only = false, month = 0, year = 0) => {
  return new Promise((resolve) => {
    const success = async (pos) => {
      const date = new Date();
      if (!month) {
        month = date.getMonth() + 1;
      }
      if (!year) {
        year = date.getFullYear();
      }
      const crd = pos.coords;
      const lat = crd.latitude;
      const lng = crd.longitude;

      console.log("Coordinates ✅", "\nlat:", lat, "\nlng:", lng);

      const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=5`;
      let data = null;
      let location = null;
      let weather = null;
      let temperature = 0;
      let address = null;
      let res = null;
      const req = new Request(url, { method: "GET" });
      let Trials = 3;
      
      do {
        res = await fetch(req);
        // console.log('Fetch Trials [' + (Trials - 1) + ']');
      } while (!res.ok && --Trials);

      if (res.ok) {
        // don't fetch for location or weather if only_time
        if (!time_only) {
          location = await get_location(lat, lng);
          weather = await get_weather(lat, lng);

          if (location) {
            address = location.address;
          }
          if (weather) {
            temperature = Math.round(+weather.current.temperature_2m);
          }
        }

        console.log("Fetch Athan ✅");
        data = (await res.json()).data;
      } else {
        console.log("Fetch Athan ❌");
      }

      resolve({ data, address, temperature });
    };

    const error = (err) => {
      console.log("Coordinates ❌");
      resolve({ data: null, address: null, temperature: 0 });
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  });
};