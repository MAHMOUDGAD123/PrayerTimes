/**
 * @param {number} lat latitude
 * @param {number} lng longitude
 * @returns {Promise<{country: string, state: string, city?: string, town?: string} | null>}
 */
export const fetch_address = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const request = new Request(url, { method: "GET" });
    const response = await fetch(request);

    if (!response.ok) {
      throw new Error("Faild to Fetch Location 🟥");
    }
    console.log("Fetch Locaiton 🟩");
    const data = (await response.json()).address;
    const country = data.country;
    const state = data.state ? `${data.state} - ` : "";
    const city_town = data.city || data.town;
    const city = city_town ? `${city_town} - ` : "";
    return `${city}${state}${country}`;
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
 * @returns {Promise<unknown[] | null>}
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

  try {
    const request = new Request(url, { method: "GET" });
    const response = await fetch(request);

    if (!response.ok) {
      throw new Error("Faild To Fetch Prayer Tiems 🟥");
    }

    return (await response.json()).data;
  } catch (error) {
    console.error(error);
    return null;
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
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  });
};
