import { exchangeNpssoForAccessCode, exchangeAccessCodeForAuthTokens, getProfileFromUserName } from "psn-api";

const myNpsso = "IQEAAAAAAPAwAACkAAgAFF8qILubAg6c9XSmgjQsxbhJ1YqLAAEABAAAAQAABwAIAAABmQfz9dwABwAIAAABmQ0aTuAAAgAITZXxbtltcCAABAAgVmlraW5nUEczRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAEY2EAAQAEAARiNgAAAAgAGFVQMDAwMS1CTFVTMzE0NTRfMDAAAAAAAAABAAQSAAIAAAAAAAAAAAAwAgBEAAgABFl/2zIACAA4MDYCGQC1PFQXMftoYuKK7/CWSUnkSKKBB6Xj1eYCGQC9W6/NbBkyKRH0mPXPJFlwcg8Avo6Rvpw=";

async function main() {
    // Step 1: Exchange NPSSO for an access code
    const accessCode = await exchangeNpssoForAccessCode(myNpsso);

    // Step 2: Exchange access code for access & refresh tokens
    const auth = await exchangeAccessCodeForAuthTokens(accessCode);

    // auth.accessToken now contains the valid token for API calls

    // Step 3: Get the profile for the current user
    const profile = await getProfileFromUserName({ accessToken: auth.accessToken }, "me");
}

main().catch(console.error);
