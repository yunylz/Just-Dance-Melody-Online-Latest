#include <wups.h>
#include <whb/log.h>
#include <whb/log_module.h>
#include <whb/log_cafe.h>
#include <whb/log_udp.h>
#include <string.h>
#include <array>
#include <algorithm>
#include <iterator>

#include <coreinit/title.h>

#include <patcher/rplinfo.h>
#include <patcher/patcher.h>

WUPS_PLUGIN_NAME("JDMOPatcher");
WUPS_PLUGIN_DESCRIPTION("Patches Just Dance titles to use Just Dance Melody Online servers.");
WUPS_PLUGIN_VERSION("v1.0");
WUPS_PLUGIN_AUTHOR("planedec50");
WUPS_PLUGIN_LICENSE("MIT");

#define JD2016_NOA_TITLE_ID 0x00050000101b9000llu
#define JD2016_NOE_TITLE_ID 0x00050000101b9800llu

#define JD2017_NOA_TITLE_ID 0x00050000101eb200llu
#define JD2017_NOE_TITLE_ID 0x00050000101eaa00llu

#define JD2018_NOA_TITLE_ID 0x0005000010211300llu
#define JD2018_NOE_TITLE_ID 0x0005000010210c00llu

#define JD2019_NOA_TITLE_ID 0x0005000010217300llu
#define JD2019_NOE_TITLE_ID 0x0005000010217000llu

#define UBISERVICES_URL     "https://{env}public-ubiservices.ubi.com/{version}"
#define HARBOUR_URL    "http://{env}harbour-proxy.c0llydoll.dev/{version}"

constexpr std::array<uint64_t, 8> jd_tids = {
    JD2016_NOA_TITLE_ID, 
    JD2016_NOE_TITLE_ID, 
    JD2017_NOA_TITLE_ID, 
    JD2017_NOE_TITLE_ID, 
    JD2018_NOA_TITLE_ID, 
    JD2018_NOE_TITLE_ID, 
    JD2019_NOA_TITLE_ID, 
    JD2019_NOE_TITLE_ID
};

ON_APPLICATION_START()
{
    // If this is not a Just Dance game no need to do anything
    uint64_t current_title_id = OSGetTitleID();
    
    bool is_jd_game = std::find(std::begin(jd_tids), std::end(jd_tids), current_title_id) != std::end(jd_tids);

    if (!is_jd_game) return;
    
    // Init logging
    if (!WHBLogModuleInit()) {
        WHBLogCafeInit();
        WHBLogUdpInit();
    }

    WHBLogPrintf("JDMO: Applying patches...");

    // Patch the dynload functions so GetRPLInfo works
    if (!PatchDynLoadFunctions()) {
        WHBLogPrintf("JDMO: Failed to patch dynload functions");
        return;
    }

    // Get the RPLInfo
    auto rpl_info = TryGetRPLInfo();
    if (!rpl_info) {
        WHBLogPrintf("JDMO: Failed to get RPL info");
        return;
    }

    // Find the RPX
    rplinfo rpls = *rpl_info;
    auto uaf_rpx = FindRPL(rpls, "wiiu_ua_engine_f.rpx");
    if (!uaf_rpx) {
        WHBLogPrintf("JDMO: Failed to find wiiu_ua_engine_f.rpx");
        return;
    }

    // Patch the UbiServices URL
    OSDynLoad_NotifyData rpx_data = *uaf_rpx;
    if (!replace_string(rpx_data.dataAddr, rpx_data.dataSize, 
        UBISERVICES_URL,  sizeof(UBISERVICES_URL),
        HARBOUR_URL, sizeof(HARBOUR_URL))) {
        WHBLogPrintf("JDMO: Failed to replace UbiServices URL");
        return;
    }
}