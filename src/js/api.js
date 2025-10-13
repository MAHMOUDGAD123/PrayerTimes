import { _Storage } from "./storage.js";
/**
 * @param {number} lat latitude
 * @param {number} lng longitude
 * @returns {Promise<{display_name: string, short_name: string} | null>}
 */
export const fetch_address = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const request = new Request(url, { method: "GET" });
    const response = await fetch(request);

    if (!response.ok) {
      throw new Error("Faild to Fetch Location 🟥");
    }
    console.log("Fetch Location 🟩");
    const { display_name, address } = await response.json();
    const state = address.state ? address.state : "";
    const city_town = address.city || address.town;
    const city = city_town ? `${city_town} - ` : "";
    const short_name = `${city}${state}`;
    return { display_name, short_name };
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * @param {number} lat latitude
 * @param {number} lng longitude
 * @param {number} month the month (1 -> 12)
 * @param {number} year the year
 * @returns {Promise<{ data: unknown[] | null; isOnline: boolean }>}
 */
export const fetch_prayers_times = async (
  lat,
  lng,
  month = undefined,
  year = undefined
) => {
  const now = new Date();
  const _month = month || now.getMonth() + 1;
  const _year = year || now.getFullYear();
  const url = `https://api.aladhan.com/v1/calendar/${_year}/${_month}?latitude=${lat}&longitude=${lng}&method=5`;
  const date_storage_key = "__prayertimes_data__";

  try {
    const request = new Request(url, { method: "GET", cache: "no-cache" });
    const response = await fetch(request);

    if (!response.ok) {
      throw new Error("Faild To Fetch Prayer Tiems 🟥");
    }

    const data = (await response.json()).data;
    console.info("Online");
    _Storage.save(date_storage_key, data, "localStorage");
    return { data, isOnline: true };
  } catch (error) {
    console.error("Offline");
    console.error(error);
    return {
      data: _Storage.read(date_storage_key, "localStorage"),
      isOnline: false,
    };
  }
};

/**
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const fetch_geolocation = () => {
  return new Promise((resolve, reject) => {
    /**@param {GeolocationPosition} position*/
    const success = async (position) => {
      const { latitude, longitude } = position.coords;
      resolve({
        latitude: latitude,
        longitude: longitude,
      });
      console.log("Coordinates ✅", "\nlat:", latitude, "\nlng:", longitude);
    };

    /**@param {GeolocationPositionError} get_error*/
    const error = (get_error) => {
      reject("Faild To Fetch Geo-Location 🟥");
      console.error(get_error.message);
    };

    /**@type {PositionOptions} */
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  });
};
