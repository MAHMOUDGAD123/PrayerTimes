export class _Storage {
  /**
   * @param {string} key
   * @param {any} data
   * @param {"localStorage" | "sessionStorage"} store
   */
  static save(key, data, store) {
    window[store].setItem(key, JSON.stringify(data));
  }

  /**
   * @param {string} key
   * @param {"localStorage" | "sessionStorage"} store
   * @returns {unknown | null}
   */
  static read(key, store) {
    const storedValue = window[store].getItem(key);
    if (storedValue) {
      return JSON.parse(storedValue);
    }
    return null;
  }

  /**
   * @param {string} key
   * @param {"localStorage" | "sessionStorage"} store
   */
  static delete(key, store) {
    window[store].removeItem(key);
  }
}
