/** 
 * WDF rooms available in JMCS.
 * 
 * Don't modify this file if you don't know what you're doing. It might break Hub frontend.
 */

module.exports.ROOMS = [
    {
        "roomName": "ExampleConfig!",
        "gameVersion": "useThisAsAnExample",
        "enabled": false,
        "skus": [],
        "config": {
            "lbSeasonDuration": null,
            "lbFirstSeasonStartTime": null,
            "themeSchedule": [],
            "roomGameVersion": "jd2017_or_anything_else"
        }
    },
    {
        "roomName": "2017JDMO",
        "gameVersion": "jd2017",
        "name": "Just Dance 2017", // name for hub
        "enabled": true,
        "seasonsEnabled": false,
        "skus": [
            "jd2017-pc-ww",
            "jd2017-ps4-scee",
            "jd2017-ps4-scea",
            "jd2017-nx-all",
            "jdmelody-pc-all"
        ],
        "config": {
            "lbSeasonDuration": 1209600000,
            "lbFirstSeasonStartTime": 1768380000000,
            "themeSchedule": [],
            "roomGameVersion": "jd2017"
        }
    },
    {
        "roomName": "MainJDMO",
        "gameVersion": "jd2018",
        "name": "Just Dance 2018 to 2022", // name for hub
        "enabled": true,
        "seasonsEnabled": true,
        "skus": [
            "jd2018-ps4-scee",
            "jd2018-pc-dev",
            "jd2018-ps4-scea",
            "jd2018-nx-all",
            "jd2019-ps4-scee",
            "jd2019-ps4-scea",
            "jd2019-nx-all",
            "jd2020-ps4-scee",
            "jd2020-ps4-scea",
            "jd2020-nx-all",
            "jd2021-ps4-scee",
            "jd2021-ps4-scea",
            "jd2021-nx-all",
            "jd2022-ps4-scee",
            "jd2022-ps4-scea",
            "jd2022-nx-all"
        ],
        "config": {
            "lbSeasonDuration": 1209600000,
            "lbFirstSeasonStartTime": 1768380000000,
            "themeSchedule": [],
            "roomGameVersion": "jd2018"
        }
    }
]