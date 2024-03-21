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

      const url = `http://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=5`;

      let data = null;
      let location = null;
      let address = null;

      const req = new Request(url, { method: "GET" });
      const response = await fetch(req);

      // don't fetch for location if only_time
      if (!time_only) {
        location = await get_location(lat, lng);
        if (location) {
          address = location.address;
        }
      }

      if (response.ok) {
        console.log("Fetch Athan ✅");
        data = (await response.json()).data;
      } else {
        console.log("Fetch Athan ❌");
      }

      resolve({ data, address });
    };

    const error = (err) => {
      console.log("Coordinates ❌");
      resolve({ data: null, address: null });
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  });
};
