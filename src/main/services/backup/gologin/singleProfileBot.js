
  // async navigateAndLogin() {
  //   try {
  //     const navigationService = new NavigationService(this.cdpClient);
  //     const authenticationService = new AuthenticationService(this.cdpClient);
  //     const navigationResult = await navigationService.navigateTo(eventURL);

  //     // Handle redirect detection and login
  //     if (navigationResult.redirectDetected) {
  //       if (navigationResult.loginPageDetected) {
  //         await this.handleLogin(authenticationService);
  //       } else {
  //         Logger.info("Redirected but not to a login page.");
  //       }
  //     } else if (navigationResult.loginPageDetected) {
  //       await this.handleLogin(authenticationService);
  //     }

  //     // Try to login if not logged in
  //     if (!authenticationService.isAuthenticated) {
  //       await this.handleLogin(authenticationService);
  //     }
  //     return { success: true };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // /**
  //  * Get the crawler service for scheduler use
  //  */
  // async makeTicketSearchAPIRequest() {
  //   // const cookies = {
  //   //   BID: "OFpx5uGOu7LGAOYPIj3gZarGJeWMpVJPovwsIPdMsbi5vYOktR1ifArEKaxN46K9LGxwIgzXcUy5qr8y",
  //   //   eps_sid: "5bb278a3cfbaff911002b4aad55199dd762db4af",
  //   //   ISID: "5e9eb235-2030-45d0-86dd-f6f2c688f4de",
  //   //   QUEUEITSID: "5B2SesNtNEyHVQkShUGfZ5QtUgbdwpTDiuuyDK5aku4",
  //   //   SID: "",
  //   //   q_i_t_u_i:
  //   //     "referrer_https%3A%2F%2Fwww.eticketing.co.uk%2F~cookiedomain_eticketing.co.uk",
  //   //   "ASP.NET_SessionId": "f4rw3weg0ahikuapfu2ahgn2",
  //   //   uniqueid: "f4rw3weg0ahikuapfu2ahgn2",
  //   //   selectedCulture: "en-GB",
  //   //   NSC_JOydqodicsnriladjes2uzco3apr2dv:
  //   //     "ffffffffc3a06e0245525d5f4f58455e445a4a423660",
  //   //   __RequestVerificationToken_L3RvdHRlbmhhbWhvdHNwdXI1:
  //   //     "8fNdSUCnRJWPieu8aRqrQXI_YPMMUF1cL7hxLvpphlb4bfb0eWkB71iBrqrJsrrSt844X9Bf-EH_yDcOxcBFEKkUjwg1",
  //   //   NSC_JOoilvjmbv3hpnkb35fzrxc5ykb2ocv:
  //   //     "ffffffff0943ed2045525d5f4f58455e445a4a423660",
  //   //   "Queueit-Session-tottenhamhotspur":
  //   //     "EventId%3Dtottenhamhotspur%26QueueId%3Dticketmastersportuk%26Expires%3D1753275630%26Hash%3Db48d05e1c136da935edc81dd3183621f7fa7cdde9f56de753a18ef899ac950b9",
  //   //   "www.eticketing.co.uk/tottenhamhotspur":
  //   //     "6F38E2F366977B0B4AEF67A7CB8FA6BE1F6F9E77FA6165BDAD63C1A9656F11C06CF3166D3036761BD4A1591CBA8FC6D1B2F5DE08BE097809256E7A7F4FA63E01B82D91E615E9A4CBBDA15A559C2CE5F51555011D",
  //   //   "www.eticketing.co.uk/tottenhamhotspur_E":
  //   //     "FADA9588B8044CF6623B9B90E509E7C5D52A7930D4DA471CAE9247BC636BA5A6DA246993B25E0624764683C4CD28CFA7A28E62995D9FAF859830DC62A42AA1DE708D19E84154E88420B14EFDBC945462817AFA160F33F39024868A088E2323D3BC1D434F20A2D879A2D6954A2F6F98BEB57865045DF9EC41F3A9D69C1A2863C1A82A7D9E75F35B4986906E59B557CB54EE90C25DD463FA9264903455E8DEA05126DE28570EC6DDB8C9CDACC96AD2A4741495A58B50205516D74D45D7E0E5018C289AD805156C8C9845AE21C168EF13C514B7B1E1352C83F5201A298950D7E9A762AC3253E52952AAD1F7E766FE09127DDB3BFBF263EC247C6B0B9CB151866EF5A90307EF61F09C23A9B956551C5FFCCD6E24253656AA9BE1B034188D8EE956B846FF4554C8F2837AD32C7CDB351E6FF1BCE95FEE77E615273CCAE4A9A0BC5E76450A6A1473DB286B708B27215EDB1DA5B79E1D3DA97FF817A7FF7D3B0D8E6E78B00F39F6",
  //   //   tmpt: "0:c973fda521000000:1753274159:93b94d56:439f4705707753ab97d4e11b6278903a:a4d94bc11700144d654787b57f61ce13d8415d1e68567d398a98da1fced0cbf1",
  //   // };

  //   try {
  //     // await this.cdpClient.send("Network.enable");
  //     // for (const [name, value] of Object.entries(cookies)) {
  //     //   await this.cdpClient.send("Network.setCookie", {
  //     //     name,
  //     //     value,
  //     //     domain: ".eticketing.co.uk",
  //     //     path: "/",
  //     //   });
  //     // }

  //     // 1. First GET Request to get verification token
  //     const url1 = `https://www.eticketing.co.uk/tottenhamhotspur/EDP/Event/Index/${eventid}?edpState=BestAvailable`;
  //     const fetchScript1 = `fetch("${url1}").then(res => res.text())`;
  //     const response1 = await this.cdpClient.send("Runtime.evaluate", {
  //       expression: fetchScript1,
  //       awaitPromise: true,
  //     });

  //     const responseBody1 = response1.result.value;
  //     const requestverificationtoken = responseBody1.match(
  //       /name="__RequestVerificationToken" type="hidden" value="(.*?)"/
  //     )[1];
  //     console.log("requestverificationtoken", requestverificationtoken);

  //     // 2. Second GET Request to get available seats
  //     const params2 = new URLSearchParams({
  //       AreSeatsTogether: "false",
  //       EventId: eventid,
  //       MaximumPrice: "10000000",
  //       MinimumPrice: "0",
  //       Quantity: "1",
  //       showHospitality: "false",
  //     });
  //     const url2 = `https://www.eticketing.co.uk/tottenhamhotspur/EDP/Seats/AvailableRegular?${params2}`;
  //     const fetchScript2 = `fetch("${url2}", { headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(res => res.json())`;
  //     const response2 = await this.cdpClient.send("Runtime.evaluate", {
  //       expression: fetchScript2,
  //       awaitPromise: true,
  //     });
  //     console.log("response2", response2);
  //     const availdata = response2?.result?.value;
  //     console.log("availdata", availdata);

  //     if (!availdata || availdata.length === 0) {
  //       console.log("No tickets available");
  //       return {
  //         success: true,
  //         data: { message: "No tickets available" },
  //         profileId: this.profileId,
  //         ticketFound: false,
  //       };
  //     }

  //     const areaid = availdata[0].AreaId;
  //     console.log("areaid", areaid);
  //     const pricebandid = availdata[0].PriceBands[0].PriceBandCode;
  //     console.log("pricebandid", pricebandid);

  //     // 3. POST Request to lock seats
  //     const url3 = `https://www.eticketing.co.uk/tottenhamhotspur/EDP/BestAvailable/RegularSeats`;
  //     const json_data3 = {
  //       EventId: eventid,
  //       Quantity: 1,
  //       AreSeatsTogether: false,
  //       AreaId: areaid,
  //       PriceBandId: pricebandid,
  //       SeatAttributeIds: [],
  //       MinimumPrice: 0,
  //       MaximumPrice: 10000000,
  //       IsGeneralAdmissionEnabled: true,
  //     };
  //     const fetchScript3 = `
  //       fetch("${url3}", {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'X-Requested-With': 'XMLHttpRequest',
  //           'RequestVerificationToken': '${requestverificationtoken}'
  //         },
  //         body: JSON.stringify(${JSON.stringify(json_data3)})
  //       }).then(res => res.json());
  //     `;
  //     const response3 = await this.cdpClient.send("Runtime.evaluate", {
  //       expression: fetchScript3,
  //       awaitPromise: true,
  //     });
  //     console.log("response3", response3);
  //     const lockData = response3?.result?.value;
  //     console.log("lockData", lockData);
  //     const priceid = lockData?.LockedSeats[0].Id;

  //     console.log("priceid", priceid);
  //     // 4. PUT Request to confirm seat selection
  //     const json_data4 = {
  //       EventId: eventid,
  //       Seats: [{ Id: priceid, PriceClassId: 1 }],
  //     };
  //     const fetchScript4 = `
  //       fetch("${url3}", {
  //         method: 'PUT',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'X-Requested-With': 'XMLHttpRequest',
  //           'RequestVerificationToken': '${requestverificationtoken}'
  //         },
  //         body: JSON.stringify(${JSON.stringify(json_data4)})
  //       }).then(res => res.json());
  //     `;
  //     const response4 = await this.cdpClient.send("Runtime.evaluate", {
  //       expression: fetchScript4,
  //       awaitPromise: true,
  //     });
  //     console.log("response4", response4);
  //     return {
  //       success: true,
  //       data: response4?.result?.value,
  //       profileId: this.profileId,
  //       ticketFound: true,
  //     };
  //   } catch (error) {
  //     Logger.error(
  //       `[${this.profileId}] Failed to make ticket search API request:`,
  //       error.message
  //     );
  //     if (error.response) {
  //       Logger.error("CDP Error data:", error.response.data.message);
  //     }
  //     return {
  //       success: false,
  //       data: { error: error.message },
  //       profileId: this.profileId,
  //       ticketFound: false,
  //     };
  //   }
  // }

  // /**
  //  * Get the crawler service for scheduler use
  //  */
  // // async makeTicketSearchAPIRequestAxios() {
  // //   const quantity = 1;

  // //   const cookies = {
  // //     BID: "OFpx5uGOu7LGAOYPIj3gZarGJeWMpVJPovwsIPdMsbi5vYOktR1ifArEKaxN46K9LGxwIgzXcUy5qr8y",
  // //     eps_sid: "5bb278a3cfbaff911002b4aad55199dd762db4af",
  // //     ISID: "5e9eb235-2030-45d0-86dd-f6f2c688f4de",
  // //     QUEUEITSID: "5B2SesNtNEyHVQkShUGfZ5QtUgbdwpTDiuuyDK5aku4",
  // //     SID: "",
  // //     q_i_t_u_i:
  // //       "referrer_https%3A%2F%2Fwww.eticketing.co.uk%2F~cookiedomain_eticketing.co.uk",
  // //     "ASP.NET_SessionId": "f4rw3weg0ahikuapfu2ahgn2",
  // //     uniqueid: "f4rw3weg0ahikuapfu2ahgn2",
  // //     selectedCulture: "en-GB",
  // //     NSC_JOydqodicsnriladjes2uzco3apr2dv:
  // //       "ffffffffc3a06e0245525d5f4f58455e445a4a423660",
  // //     __RequestVerificationToken_L3RvdHRlbmhhbWhvdHNwdXI1:
  // //       "8fNdSUCnRJWPieu8aRqrQXI_YPMMUF1cL7hxLvpphlb4bfb0eWkB71iBrqrJsrrSt844X9Bf-EH_yDcOxcBFEKkUjwg1",
  // //     NSC_JOoilvjmbv3hpnkb35fzrxc5ykb2ocv:
  // //       "ffffffff0943ed2045525d5f4f58455e445a4a423660",
  // //     "Queueit-Session-tottenhamhotspur":
  // //       "EventId%3Dtottenhamhotspur%26QueueId%3Dticketmastersportuk%26Expires%3D1753275630%26Hash%3Db48d05e1c136da935edc81dd3183621f7fa7cdde9f56de753a18ef899ac950b9",
  // //     "www.eticketing.co.uk/tottenhamhotspur":
  // //       "6F38E2F366977B0B4AEF67A7CB8FA6BE1F6F9E77FA6165BDAD63C1A9656F11C06CF3166D3036761BD4A1591CBA8FC6D1B2F5DE08BE097809256E7A7F4FA63E01B82D91E615E9A4CBBDA15A559C2CE5F51555011D",
  // //     "www.eticketing.co.uk/tottenhamhotspur_E":
  // //       "FADA9588B8044CF6623B9B90E509E7C5D52A7930D4DA471CAE9247BC636BA5A6DA246993B25E0624764683C4CD28CFA7A28E62995D9FAF859830DC62A42AA1DE708D19E84154E88420B14EFDBC945462817AFA160F33F39024868A088E2323D3BC1D434F20A2D879A2D6954A2F6F98BEB57865045DF9EC41F3A9D69C1A2863C1A82A7D9E75F35B4986906E59B557CB54EE90C25DD463FA9264903455E8DEA05126DE28570EC6DDB8C9CDACC96AD2A4741495A58B50205516D74D45D7E0E5018C289AD805156C8C9845AE21C168EF13C514B7B1E1352C83F5201A298950D7E9A762AC3253E52952AAD1F7E766FE09127DDB3BFBF263EC247C6B0B9CB151866EF5A90307EF61F09C23A9B956551C5FFCCD6E24253656AA9BE1B034188D8EE956B846FF4554C8F2837AD32C7CDB351E6FF1BCE95FEE77E615273CCAE4A9A0BC5E76450A6A1473DB286B708B27215EDB1DA5B79E1D3DA97FF817A7FF7D3B0D8E6E78B00F39F6",
  // //     tmpt: "0:c973fda521000000:1753274159:93b94d56:439f4705707753ab97d4e11b6278903a:a4d94bc11700144d654787b57f61ce13d8415d1e68567d398a98da1fced0cbf1",
  // //   };

  // //   const cookieString = Object.entries(cookies)
  // //     .map(([key, value]) => `${key}=${value}`)
  // //     .join("; ");

  // //   try {
  // //     // 1. First GET Request to get verification token
  // //     const headers1 = {
  // //       accept:
  // //         "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  // //       "accept-language": "en-US,en;q=0.8",
  // //       priority: "u=0, i",
  // //       "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
  // //       "sec-ch-ua-mobile": "?0",
  // //       "sec-ch-ua-platform": '"Windows"',
  // //       "sec-fetch-dest": "document",
  // //       "sec-fetch-mode": "navigate",
  // //       "sec-fetch-site": "none",
  // //       "sec-fetch-user": "?1",
  // //       "sec-gpc": "1",
  // //       "upgrade-insecure-requests": "1",
  // //       "user-agent":
  // //         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  // //       Cookie: cookieString,
  // //     };

  // //     console.log("headers1", headers1);
  // //     const response1 = await axios.get(
  // //       `https://www.eticketing.co.uk/tottenhamhotspur/EDP/Event/Index/${eventid}`,
  // //       {
  // //         params: { edpState: "BestAvailable" },
  // //         headers: headers1,
  // //       }
  // //     );

  // //     console.log("response1", response1);
  // //     const requestverificationtoken = response1.data.match(
  // //       /name="__RequestVerificationToken" type="hidden" value="(.*?)"/
  // //     )[1];
  // //     console.log("requestverificationtoken", requestverificationtoken);
  // //     // 2. Second GET Request to get available seats
  // //     const headers2 = {
  // //       accept: "application/json, text/plain, */*",
  // //       "accept-language": "en-US,en;q=0.8",
  // //       priority: "u=1, i",
  // //       referer: `https://www.eticketing.co.uk/tottenhamhotspur/EDP/Event/Index/${eventid}?edpState=BestAvailable`,
  // //       "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
  // //       "sec-ch-ua-mobile": "?0",
  // //       "sec-ch-ua-platform": '"Windows"',
  // //       "sec-fetch-dest": "empty",
  // //       "sec-fetch-mode": "cors",
  // //       "sec-fetch-site": "same-origin",
  // //       "sec-gpc": "1",
  // //       "user-agent":
  // //         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  // //       "x-requested-with": "XMLHttpRequest",
  // //       Cookie: cookieString,
  // //     };

  // //     console.log("headers2", headers2);
  // //     const params2 = {
  // //       AreSeatsTogether: "false",
  // //       EventId: eventid,
  // //       MaximumPrice: "10000000",
  // //       MinimumPrice: "0",
  // //       Quantity: "1",
  // //       showHospitality: "false",
  // //     };

  // //     console.log("params2", params2);
  // //     const response2 = await axios.get(
  // //       "https://www.eticketing.co.uk/tottenhamhotspur/EDP/Seats/AvailableRegular",
  // //       {
  // //         params: params2,
  // //         headers: headers2,
  // //       }
  // //     );

  // //     console.log("response2", response2);
  // //     const availdata = response2.data;
  // //     if (availdata.length === 0) {
  // //       return {
  // //         success: true,
  // //         data: { message: "No tickets available" },
  // //         profileId: this.profileId,
  // //         ticketFound: false,
  // //       };
  // //     }

  // //     console.log("availdata", availdata);
  // //     const areaid = availdata[0].AreaId;
  // //     const pricebandid = availdata[0].PriceBands[0].PriceBandCode;

  // //     // 3. POST Request to lock seats
  // //     const headers3 = {
  // //       accept: "application/json, text/plain, */*",
  // //       "accept-language": "en-US,en;q=0.8",
  // //       "content-type": "application/json",
  // //       origin: "https://www.eticketing.co.uk",
  // //       priority: "u=1, i",
  // //       referer:
  // //         "https://www.eticketing.co.uk/tottenhamhotspur/EDP/Event/Index/9769?edpState=BestAvailable",
  // //       requestverificationtoken: requestverificationtoken,
  // //       "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
  // //       "sec-ch-ua-mobile": "?0",
  // //       "sec-ch-ua-platform": '"Windows"',
  // //       "sec-fetch-dest": "empty",
  // //       "sec-fetch-mode": "cors",
  // //       "sec-fetch-site": "same-origin",
  // //       "sec-gpc": "1",
  // //       "user-agent":
  // //         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  // //       "x-requested-with": "XMLHttpRequest",
  // //       Cookie: cookieString,
  // //     };

  // //     console.log("headers3", headers3);
  // //     const json_data3 = {
  // //       EventId: eventid,
  // //       Quantity: 1,
  // //       AreSeatsTogether: false,
  // //       AreaId: areaid,
  // //       PriceBandId: pricebandid,
  // //       SeatAttributeIds: [],
  // //       MinimumPrice: 0,
  // //       MaximumPrice: 10000000,
  // //       IsGeneralAdmissionEnabled: true,
  // //     };

  // //     console.log("json_data3", json_data3);
  // //     const response3 = await axios.post(
  // //       "https://www.eticketing.co.uk/tottenhamhotspur/EDP/BestAvailable/RegularSeats",
  // //       json_data3,
  // //       { headers: headers3 }
  // //     );

  // //     console.log("response3", response3);

  // //     const priceid = response3.data.LockedSeats[0].Id;
  // //     console.log("priceid", priceid);
  // //     // 4. PUT Request to confirm seat selection
  // //     const headers4 = {
  // //       accept: "application/json, text/plain, */*",
  // //       "accept-language": "en-US,en;q=0.5",
  // //       "content-type": "application/json",
  // //       origin: "https://www.eticketing.co.uk",
  // //       priority: "u=1, i",
  // //       referer: `https://www.eticketing.co.uk/tottenhamhotspur/EDP/Event/Index/${eventid}?edpState=BestAvailable`,
  // //       requestverificationtoken: requestverificationtoken,
  // //       "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
  // //       "sec-ch-ua-mobile": "?0",
  // //       "sec-ch-ua-platform": '"Windows"',
  // //       "sec-fetch-dest": "empty",
  // //       "sec-fetch-mode": "cors",
  // //       "sec-fetch-site": "same-origin",
  // //       "sec-gpc": "1",
  // //       "user-agent":
  // //         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  // //       "x-requested-with": "XMLHttpRequest",
  // //       Cookie: cookieString,
  // //     };

  // //     console.log("headers4", headers4);
  // //     const json_data4 = {
  // //       EventId: eventid,
  // //       Seats: [
  // //         {
  // //           Id: priceid,
  // //           PriceClassId: 1,
  // //         },
  // //       ],
  // //     };

  // //     console.log("json_data4", json_data4);
  // //     const response4 = await axios.put(
  // //       "https://www.eticketing.co.uk/tottenhamhotspur/EDP/BestAvailable/RegularSeats",
  // //       json_data4,
  // //       { headers: headers4 }
  // //     );

  // //     console.log("response4", response4);

  // //     return {
  // //       success: true,
  // //       data: response4.data,
  // //       profileId: this.profileId,
  // //       ticketFound: true,
  // //     };
  // //   } catch (error) {
  // //     Logger.error(
  // //       `[${this.profileId}] Failed to make ticket search API request:`,
  // //       error.message
  // //     );
  // //     return {
  // //       success: false,
  // //       data: { error: error.message },
  // //       profileId: this.profileId,
  // //       ticketFound: false,
  // //     };
  // //   }
  // // }

  // /**
  //  * Handle login process when login page is detected
  //  */
  // async handleLogin(authenticationService) {
  //   try {
  //     // Get credentials from config
  //     const email = this.profile.email;
  //     const password = this.profile.password;

  //     if (!email || !password) {
  //       throw new Error(
  //         "Login credentials not found in configuration. Please set TICKETMASTER_EMAIL and TICKETMASTER_PASSWORD in .env file"
  //       );
  //     }

  //     Logger.important(
  //       `Attempting login with email: ${email.substring(0, 3)}***@${
  //         email.split("@")[1]
  //       }`
  //     );

  //     // Perform login
  //     const loginResult = await authenticationService.performLogin(
  //       email,
  //       password
  //     );

  //     if (loginResult.success) {
  //       return loginResult;
  //     } else {
  //       throw new Error(`Login failed: ${loginResult.message}`);
  //     }
  //   } catch (error) {
  //     Logger.error(" Login process failed:", error.message);
  //     throw error;
  //   }
  // }

  // stop() {
  //   this.isRunning = false;
  //   Logger.info(`[${this.profileId}] Stop requested`);
  // }

  // async cleanup() {
  //   try {
  //     if (this.browserService) {
  //       await this.browserService.close();
  //     }
  //   } catch (error) {
  //     console.error(`[${this.profileId}] Error during cleanup:`, error.message);
  //   }
  // }