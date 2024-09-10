const axios = require("axios");

class WordPress {
  constructor(siteUrl, username, password) {
    this.siteUrl = siteUrl;
    this.auth = {
      username: username,
      password: password,
    };
  }

  /**
   * Tests the connection to the WordPress site.
   * This method attempts to fetch the current user's information from the WordPress REST API.
   * If successful, it indicates that the provided credentials are valid and the site is accessible.
   *
   * @returns {Promise<boolean>} A promise that resolves to true if the connection is successful, false otherwise.
   */
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.siteUrl}/wp-json/wp/v2/users/me`,
        {
          auth: this.auth,
          timeout: 5000, // 5 seconds timeout
        }
      );
      console.log("Connection successful:", response.data);
      return response.status === 200;
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(
          "Connection test failed:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Connection test failed: No response received");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Connection test failed:", error.message);
      }
      return false;
    }
  }
}

module.exports = WordPress;
