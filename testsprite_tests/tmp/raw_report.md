
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** nextjs_space
- **Date:** 2026-03-30
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 post api signup user registration
- **Test Code:** [TC001_post_api_signup_user_registration.py](./TC001_post_api_signup_user_registration.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 81, in <module>
  File "<string>", line 28, in test_post_api_signup_user_registration
AssertionError: Expected 200 OK, got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/5f5c254f-ce4e-4d0f-9364-cdc61c9d84a5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post api auth signin user login
- **Test Code:** [TC002_post_api_auth_signin_user_login.py](./TC002_post_api_auth_signin_user_login.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 54, in <module>
  File "<string>", line 34, in test_post_api_auth_signin_user_login
AssertionError: Response JSON is missing or empty for valid credentials

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/fe32c427-ca01-4593-9e37-33bf5ff2f827
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 post api documents create new document
- **Test Code:** [TC003_post_api_documents_create_new_document.py](./TC003_post_api_documents_create_new_document.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 974, in json
    return complexjson.loads(self.text, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/__init__.py", line 514, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 386, in decode
    obj, end = self.raw_decode(s)
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 416, in raw_decode
    return self.scan_once(s, idx=_w(s, idx).end())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
simplejson.errors.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "<string>", line 15, in test_post_api_documents_create_new_document
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 978, in json
    raise RequestsJSONDecodeError(e.msg, e.doc, e.pos)
requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 66, in <module>
  File "<string>", line 17, in test_post_api_documents_create_new_document
AssertionError: Signin response is not JSON: <!DOCTYPE html><html lang="tr"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/7cca8e2c5137bd71.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/css/ab629b7b8204f1f0.css" data-precedence="next"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-40b20267bcd53f55.js"/><script src="/_next/static/chunks/fd9d1056-af2fe23825d82c65.js" async=""></script><script src="/_next/static/chunks/2117-5a2a337148068ecc.js" async=""></script><script src="/_next/static/chunks/main-app-e1bb34c0852cf5fd.js" async=""></script><script src="/_next/static/chunks/6579-2c89e3ff868f6bee.js" async=""></script><script src="/_next/static/chunks/605-5b7f6a03da029828.js" async=""></script><script src="/_next/static/chunks/app/(auth)/login/page-66e99b242c3a9371.js" async=""></script><script src="/_next/static/chunks/7204-f2daa0e641f37873.js" async=""></script><script src="/_next/static/chunks/4587-02f21598cdfcbdd5.js" async=""></script><script src="/_next/static/chunks/app/layout-9990f38dbf91244b.js" async=""></script><title>QDMS - Kalite Doküman Yönetim Sistemi</title><meta name="description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta property="og:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:image" content="http://localhost:3000/og-image.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta name="twitter:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta name="twitter:image" content="http://localhost:3000/og-image.png"/><link rel="shortcut icon" href="/favicon.svg"/><link rel="icon" href="/favicon.svg"/><script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head><body class="__className_f367f3"><script src="/_next/static/chunks/webpack-40b20267bcd53f55.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])</script><script>self.__next_f.push([1,"1:HL[\"/_next/static/css/7cca8e2c5137bd71.css\",\"style\"]\n2:HL[\"/_next/static/css/ab629b7b8204f1f0.css\",\"style\"]\n"])</script><script>self.__next_f.push([1,"3:I[12846,[],\"\"]\n5:I[19107,[],\"ClientPageRoot\"]\n6:I[71734,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4665\",\"static/chunks/app/(auth)/login/page-66e99b242c3a9371.js\"],\"default\",1]\n7:I[4707,[],\"\"]\n8:I[36423,[],\"\"]\n9:I[72232,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Providers\"]\ne:I[59556,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Toaster\"]\n10:I[61060,[],\"\"]\na:{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"}\nb:{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"}\nc:{\"display\":\"inline-block\"}\nd:{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0}\n11:[]\n"])</script><script>self.__next_f.push([1,"0:[\"$\",\"$L3\",null,{\"buildId\":\"vVawHFkt7nhOQa-ccW_7p\",\"assetPrefix\":\"\",\"urlParts\":[\"\",\"login?callbackUrl=http%3A%2F%2Flocalhost%3A3000\"],\"initialTree\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__?{\\\"callbackUrl\\\":\\\"http://localhost:3000\\\"}\",{}]}]}]},\"$undefined\",\"$undefined\",true],\"initialSeedData\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__\",{},[[\"$L4\",[\"$\",\"$L5\",null,{\"props\":{\"params\":{},\"searchParams\":{\"callbackUrl\":\"http://localhost:3000\"}},\"Component\":\"$6\"}],null],null],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\",\"login\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"notFoundStyles\":\"$undefined\"}]],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"},\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"},\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":{\"display\":\"inline-block\"},\"children\":[\"$\",\"h2\",null,{\"style\":{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0},\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}]],null]},[[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/7cca8e2c5137bd71.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}],[\"$\",\"link\",\"1\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/ab629b7b8204f1f0.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}]],[\"$\",\"html\",null,{\"lang\":\"tr\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"body\",null,{\"className\":\"__className_f367f3\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"$L9\",null,{\"children\":[[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":\"$a\",\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":\"$b\",\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":\"$c\",\"children\":[\"$\",\"h2\",null,{\"style\":\"$d\",\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}],[\"$\",\"$Le\",null,{}]]}]}]}]],null],null],\"couldBeIntercepted\":false,\"initialHead\":[null,\"$Lf\"],\"globalErrorComponent\":\"$10\",\"missingSlots\":\"$W11\"}]\n"])</script><script>self.__next_f.push([1,"f:[[\"$\",\"meta\",\"0\",{\"name\":\"viewport\",\"content\":\"width=device-width, initial-scale=1\"}],[\"$\",\"meta\",\"1\",{\"charSet\":\"utf-8\"}],[\"$\",\"title\",\"2\",{\"children\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"3\",{\"name\":\"description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"4\",{\"property\":\"og:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"5\",{\"property\":\"og:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"6\",{\"property\":\"og:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"meta\",\"7\",{\"name\":\"twitter:card\",\"content\":\"summary_large_image\"}],[\"$\",\"meta\",\"8\",{\"name\":\"twitter:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"9\",{\"name\":\"twitter:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"10\",{\"name\":\"twitter:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"link\",\"11\",{\"rel\":\"shortcut icon\",\"href\":\"/favicon.svg\"}],[\"$\",\"link\",\"12\",{\"rel\":\"icon\",\"href\":\"/favicon.svg\"}]]\n4:null\n"])</script></body></html>

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/796990fd-12d1-40db-a79b-d0592aa87bce
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 post api documents id review send document for review
- **Test Code:** [TC004_post_api_documents_id_review_send_document_for_review.py](./TC004_post_api_documents_id_review_send_document_for_review.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 83, in <module>
  File "<string>", line 21, in test_post_api_documents_id_review_send_document_for_review
AssertionError: Signin response is not JSON: <!DOCTYPE html><html lang="tr"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/7cca8e2c5137bd71.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/css/ab629b7b8204f1f0.css" data-precedence="next"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-40b20267bcd53f55.js"/><script src="/_next/static/chunks/fd9d1056-af2fe23825d82c65.js" async=""></script><script src="/_next/static/chunks/2117-5a2a337148068ecc.js" async=""></script><script src="/_next/static/chunks/main-app-e1bb34c0852cf5fd.js" async=""></script><script src="/_next/static/chunks/6579-2c89e3ff868f6bee.js" async=""></script><script src="/_next/static/chunks/605-5b7f6a03da029828.js" async=""></script><script src="/_next/static/chunks/app/(auth)/login/page-66e99b242c3a9371.js" async=""></script><script src="/_next/static/chunks/7204-f2daa0e641f37873.js" async=""></script><script src="/_next/static/chunks/4587-02f21598cdfcbdd5.js" async=""></script><script src="/_next/static/chunks/app/layout-9990f38dbf91244b.js" async=""></script><title>QDMS - Kalite Doküman Yönetim Sistemi</title><meta name="description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta property="og:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:image" content="http://localhost:3000/og-image.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta name="twitter:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta name="twitter:image" content="http://localhost:3000/og-image.png"/><link rel="shortcut icon" href="/favicon.svg"/><link rel="icon" href="/favicon.svg"/><script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head><body class="__className_f367f3"><script src="/_next/static/chunks/webpack-40b20267bcd53f55.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])</script><script>self.__next_f.push([1,"1:HL[\"/_next/static/css/7cca8e2c5137bd71.css\",\"style\"]\n2:HL[\"/_next/static/css/ab629b7b8204f1f0.css\",\"style\"]\n"])</script><script>self.__next_f.push([1,"3:I[12846,[],\"\"]\n5:I[19107,[],\"ClientPageRoot\"]\n6:I[71734,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4665\",\"static/chunks/app/(auth)/login/page-66e99b242c3a9371.js\"],\"default\",1]\n7:I[4707,[],\"\"]\n8:I[36423,[],\"\"]\n9:I[72232,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Providers\"]\ne:I[59556,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Toaster\"]\n10:I[61060,[],\"\"]\na:{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"}\nb:{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"}\nc:{\"display\":\"inline-block\"}\nd:{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0}\n11:[]\n"])</script><script>self.__next_f.push([1,"0:[\"$\",\"$L3\",null,{\"buildId\":\"vVawHFkt7nhOQa-ccW_7p\",\"assetPrefix\":\"\",\"urlParts\":[\"\",\"login?callbackUrl=http%3A%2F%2Flocalhost%3A3000\"],\"initialTree\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__?{\\\"callbackUrl\\\":\\\"http://localhost:3000\\\"}\",{}]}]}]},\"$undefined\",\"$undefined\",true],\"initialSeedData\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__\",{},[[\"$L4\",[\"$\",\"$L5\",null,{\"props\":{\"params\":{},\"searchParams\":{\"callbackUrl\":\"http://localhost:3000\"}},\"Component\":\"$6\"}],null],null],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\",\"login\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"notFoundStyles\":\"$undefined\"}]],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"},\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"},\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":{\"display\":\"inline-block\"},\"children\":[\"$\",\"h2\",null,{\"style\":{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0},\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}]],null]},[[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/7cca8e2c5137bd71.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}],[\"$\",\"link\",\"1\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/ab629b7b8204f1f0.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}]],[\"$\",\"html\",null,{\"lang\":\"tr\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"body\",null,{\"className\":\"__className_f367f3\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"$L9\",null,{\"children\":[[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":\"$a\",\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":\"$b\",\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":\"$c\",\"children\":[\"$\",\"h2\",null,{\"style\":\"$d\",\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}],[\"$\",\"$Le\",null,{}]]}]}]}]],null],null],\"couldBeIntercepted\":false,\"initialHead\":[null,\"$Lf\"],\"globalErrorComponent\":\"$10\",\"missingSlots\":\"$W11\"}]\n"])</script><script>self.__next_f.push([1,"f:[[\"$\",\"meta\",\"0\",{\"name\":\"viewport\",\"content\":\"width=device-width, initial-scale=1\"}],[\"$\",\"meta\",\"1\",{\"charSet\":\"utf-8\"}],[\"$\",\"title\",\"2\",{\"children\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"3\",{\"name\":\"description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"4\",{\"property\":\"og:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"5\",{\"property\":\"og:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"6\",{\"property\":\"og:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"meta\",\"7\",{\"name\":\"twitter:card\",\"content\":\"summary_large_image\"}],[\"$\",\"meta\",\"8\",{\"name\":\"twitter:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"9\",{\"name\":\"twitter:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"10\",{\"name\":\"twitter:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"link\",\"11\",{\"rel\":\"shortcut icon\",\"href\":\"/favicon.svg\"}],[\"$\",\"link\",\"12\",{\"rel\":\"icon\",\"href\":\"/favicon.svg\"}]]\n4:null\n"])</script></body></html>

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/73f4eb5b-2e0c-4d88-85d7-05e0637c1d77
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 post api documents id approve approve document
- **Test Code:** [TC005_post_api_documents_id_approve_approve_document.py](./TC005_post_api_documents_id_approve_approve_document.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 974, in json
    return complexjson.loads(self.text, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/__init__.py", line 514, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 386, in decode
    obj, end = self.raw_decode(s)
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 416, in raw_decode
    return self.scan_once(s, idx=_w(s, idx).end())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
simplejson.errors.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "<string>", line 21, in test_post_api_documents_id_approve_approve_document
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 978, in json
    raise RequestsJSONDecodeError(e.msg, e.doc, e.pos)
requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 86, in <module>
  File "<string>", line 23, in test_post_api_documents_id_approve_approve_document
AssertionError: Signin response is not valid JSON: <!DOCTYPE html><html lang="tr"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/7cca8e2c5137bd71.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/css/ab629b7b8204f1f0.css" data-precedence="next"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-40b20267bcd53f55.js"/><script src="/_next/static/chunks/fd9d1056-af2fe23825d82c65.js" async=""></script><script src="/_next/static/chunks/2117-5a2a337148068ecc.js" async=""></script><script src="/_next/static/chunks/main-app-e1bb34c0852cf5fd.js" async=""></script><script src="/_next/static/chunks/6579-2c89e3ff868f6bee.js" async=""></script><script src="/_next/static/chunks/605-5b7f6a03da029828.js" async=""></script><script src="/_next/static/chunks/app/(auth)/login/page-66e99b242c3a9371.js" async=""></script><script src="/_next/static/chunks/7204-f2daa0e641f37873.js" async=""></script><script src="/_next/static/chunks/4587-02f21598cdfcbdd5.js" async=""></script><script src="/_next/static/chunks/app/layout-9990f38dbf91244b.js" async=""></script><title>QDMS - Kalite Doküman Yönetim Sistemi</title><meta name="description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta property="og:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:image" content="http://localhost:3000/og-image.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta name="twitter:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta name="twitter:image" content="http://localhost:3000/og-image.png"/><link rel="shortcut icon" href="/favicon.svg"/><link rel="icon" href="/favicon.svg"/><script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head><body class="__className_f367f3"><script src="/_next/static/chunks/webpack-40b20267bcd53f55.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])</script><script>self.__next_f.push([1,"1:HL[\"/_next/static/css/7cca8e2c5137bd71.css\",\"style\"]\n2:HL[\"/_next/static/css/ab629b7b8204f1f0.css\",\"style\"]\n"])</script><script>self.__next_f.push([1,"3:I[12846,[],\"\"]\n5:I[19107,[],\"ClientPageRoot\"]\n6:I[71734,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4665\",\"static/chunks/app/(auth)/login/page-66e99b242c3a9371.js\"],\"default\",1]\n7:I[4707,[],\"\"]\n8:I[36423,[],\"\"]\n9:I[72232,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Providers\"]\ne:I[59556,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Toaster\"]\n10:I[61060,[],\"\"]\na:{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"}\nb:{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"}\nc:{\"display\":\"inline-block\"}\nd:{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0}\n11:[]\n"])</script><script>self.__next_f.push([1,"0:[\"$\",\"$L3\",null,{\"buildId\":\"vVawHFkt7nhOQa-ccW_7p\",\"assetPrefix\":\"\",\"urlParts\":[\"\",\"login?callbackUrl=http%3A%2F%2Flocalhost%3A3000\"],\"initialTree\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__?{\\\"callbackUrl\\\":\\\"http://localhost:3000\\\"}\",{}]}]}]},\"$undefined\",\"$undefined\",true],\"initialSeedData\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__\",{},[[\"$L4\",[\"$\",\"$L5\",null,{\"props\":{\"params\":{},\"searchParams\":{\"callbackUrl\":\"http://localhost:3000\"}},\"Component\":\"$6\"}],null],null],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\",\"login\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"notFoundStyles\":\"$undefined\"}]],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"},\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"},\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":{\"display\":\"inline-block\"},\"children\":[\"$\",\"h2\",null,{\"style\":{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0},\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}]],null]},[[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/7cca8e2c5137bd71.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}],[\"$\",\"link\",\"1\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/ab629b7b8204f1f0.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}]],[\"$\",\"html\",null,{\"lang\":\"tr\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"body\",null,{\"className\":\"__className_f367f3\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"$L9\",null,{\"children\":[[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":\"$a\",\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":\"$b\",\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":\"$c\",\"children\":[\"$\",\"h2\",null,{\"style\":\"$d\",\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}],[\"$\",\"$Le\",null,{}]]}]}]}]],null],null],\"couldBeIntercepted\":false,\"initialHead\":[null,\"$Lf\"],\"globalErrorComponent\":\"$10\",\"missingSlots\":\"$W11\"}]\n"])</script><script>self.__next_f.push([1,"f:[[\"$\",\"meta\",\"0\",{\"name\":\"viewport\",\"content\":\"width=device-width, initial-scale=1\"}],[\"$\",\"meta\",\"1\",{\"charSet\":\"utf-8\"}],[\"$\",\"title\",\"2\",{\"children\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"3\",{\"name\":\"description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"4\",{\"property\":\"og:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"5\",{\"property\":\"og:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"6\",{\"property\":\"og:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"meta\",\"7\",{\"name\":\"twitter:card\",\"content\":\"summary_large_image\"}],[\"$\",\"meta\",\"8\",{\"name\":\"twitter:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"9\",{\"name\":\"twitter:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"10\",{\"name\":\"twitter:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"link\",\"11\",{\"rel\":\"shortcut icon\",\"href\":\"/favicon.svg\"}],[\"$\",\"link\",\"12\",{\"rel\":\"icon\",\"href\":\"/favicon.svg\"}]]\n4:null\n"])</script></body></html>

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/c6525538-0e57-43ed-a9d3-14f9581d9c3f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 get api documents list all documents
- **Test Code:** [TC006_get_api_documents_list_all_documents.py](./TC006_get_api_documents_list_all_documents.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 51, in <module>
  File "<string>", line 23, in test_get_api_documents_list_all_documents
AssertionError: Signin response not JSON: <!DOCTYPE html><html lang="tr"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/7cca8e2c5137bd71.css" data-precedence="next"/><link rel="stylesheet" href="/_next/static/css/ab629b7b8204f1f0.css" data-precedence="next"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-40b20267bcd53f55.js"/><script src="/_next/static/chunks/fd9d1056-af2fe23825d82c65.js" async=""></script><script src="/_next/static/chunks/2117-5a2a337148068ecc.js" async=""></script><script src="/_next/static/chunks/main-app-e1bb34c0852cf5fd.js" async=""></script><script src="/_next/static/chunks/6579-2c89e3ff868f6bee.js" async=""></script><script src="/_next/static/chunks/605-5b7f6a03da029828.js" async=""></script><script src="/_next/static/chunks/app/(auth)/login/page-66e99b242c3a9371.js" async=""></script><script src="/_next/static/chunks/7204-f2daa0e641f37873.js" async=""></script><script src="/_next/static/chunks/4587-02f21598cdfcbdd5.js" async=""></script><script src="/_next/static/chunks/app/layout-9990f38dbf91244b.js" async=""></script><title>QDMS - Kalite Doküman Yönetim Sistemi</title><meta name="description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta property="og:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta property="og:image" content="http://localhost:3000/og-image.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="QDMS - Kalite Doküman Yönetim Sistemi"/><meta name="twitter:description" content="Entegre Kalite ve Doküman Yönetim Sistemi"/><meta name="twitter:image" content="http://localhost:3000/og-image.png"/><link rel="shortcut icon" href="/favicon.svg"/><link rel="icon" href="/favicon.svg"/><script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script></head><body class="__className_f367f3"><script src="/_next/static/chunks/webpack-40b20267bcd53f55.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])</script><script>self.__next_f.push([1,"1:HL[\"/_next/static/css/7cca8e2c5137bd71.css\",\"style\"]\n2:HL[\"/_next/static/css/ab629b7b8204f1f0.css\",\"style\"]\n"])</script><script>self.__next_f.push([1,"3:I[12846,[],\"\"]\n5:I[19107,[],\"ClientPageRoot\"]\n6:I[71734,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4665\",\"static/chunks/app/(auth)/login/page-66e99b242c3a9371.js\"],\"default\",1]\n7:I[4707,[],\"\"]\n8:I[36423,[],\"\"]\n9:I[72232,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Providers\"]\ne:I[59556,[\"6579\",\"static/chunks/6579-2c89e3ff868f6bee.js\",\"7204\",\"static/chunks/7204-f2daa0e641f37873.js\",\"605\",\"static/chunks/605-5b7f6a03da029828.js\",\"4587\",\"static/chunks/4587-02f21598cdfcbdd5.js\",\"3185\",\"static/chunks/app/layout-9990f38dbf91244b.js\"],\"Toaster\"]\n10:I[61060,[],\"\"]\na:{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"}\nb:{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"}\nc:{\"display\":\"inline-block\"}\nd:{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0}\n11:[]\n"])</script><script>self.__next_f.push([1,"0:[\"$\",\"$L3\",null,{\"buildId\":\"vVawHFkt7nhOQa-ccW_7p\",\"assetPrefix\":\"\",\"urlParts\":[\"\",\"login?callbackUrl=http%3A%2F%2Flocalhost%3A3000\"],\"initialTree\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__?{\\\"callbackUrl\\\":\\\"http://localhost:3000\\\"}\",{}]}]}]},\"$undefined\",\"$undefined\",true],\"initialSeedData\":[\"\",{\"children\":[\"(auth)\",{\"children\":[\"login\",{\"children\":[\"__PAGE__\",{},[[\"$L4\",[\"$\",\"$L5\",null,{\"props\":{\"params\":{},\"searchParams\":{\"callbackUrl\":\"http://localhost:3000\"}},\"Component\":\"$6\"}],null],null],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\",\"login\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"notFoundStyles\":\"$undefined\"}]],null]},[null,[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\",\"(auth)\",\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"},\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"},\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":{\"display\":\"inline-block\"},\"children\":[\"$\",\"h2\",null,{\"style\":{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0},\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}]],null]},[[[[\"$\",\"link\",\"0\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/7cca8e2c5137bd71.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}],[\"$\",\"link\",\"1\",{\"rel\":\"stylesheet\",\"href\":\"/_next/static/css/ab629b7b8204f1f0.css\",\"precedence\":\"next\",\"crossOrigin\":\"$undefined\"}]],[\"$\",\"html\",null,{\"lang\":\"tr\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"body\",null,{\"className\":\"__className_f367f3\",\"suppressHydrationWarning\":true,\"children\":[\"$\",\"$L9\",null,{\"children\":[[\"$\",\"$L7\",null,{\"parallelRouterKey\":\"children\",\"segmentPath\":[\"children\"],\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L8\",null,{}],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"}],[\"$\",\"div\",null,{\"style\":\"$a\",\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}}],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":\"$b\",\"children\":\"404\"}],[\"$\",\"div\",null,{\"style\":\"$c\",\"children\":[\"$\",\"h2\",null,{\"style\":\"$d\",\"children\":\"This page could not be found.\"}]}]]}]}]],\"notFoundStyles\":[]}],[\"$\",\"$Le\",null,{}]]}]}]}]],null],null],\"couldBeIntercepted\":false,\"initialHead\":[null,\"$Lf\"],\"globalErrorComponent\":\"$10\",\"missingSlots\":\"$W11\"}]\n"])</script><script>self.__next_f.push([1,"f:[[\"$\",\"meta\",\"0\",{\"name\":\"viewport\",\"content\":\"width=device-width, initial-scale=1\"}],[\"$\",\"meta\",\"1\",{\"charSet\":\"utf-8\"}],[\"$\",\"title\",\"2\",{\"children\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"3\",{\"name\":\"description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"4\",{\"property\":\"og:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"5\",{\"property\":\"og:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"6\",{\"property\":\"og:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"meta\",\"7\",{\"name\":\"twitter:card\",\"content\":\"summary_large_image\"}],[\"$\",\"meta\",\"8\",{\"name\":\"twitter:title\",\"content\":\"QDMS - Kalite Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"9\",{\"name\":\"twitter:description\",\"content\":\"Entegre Kalite ve Doküman Yönetim Sistemi\"}],[\"$\",\"meta\",\"10\",{\"name\":\"twitter:image\",\"content\":\"http://localhost:3000/og-image.png\"}],[\"$\",\"link\",\"11\",{\"rel\":\"shortcut icon\",\"href\":\"/favicon.svg\"}],[\"$\",\"link\",\"12\",{\"rel\":\"icon\",\"href\":\"/favicon.svg\"}]]\n4:null\n"])</script></body></html>

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/5e805c1d-b971-4847-aee8-a7636f7fed57
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 get api documents id get document detail
- **Test Code:** [TC007_get_api_documents_id_get_document_detail.py](./TC007_get_api_documents_id_get_document_detail.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 974, in json
    return complexjson.loads(self.text, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/__init__.py", line 514, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 386, in decode
    obj, end = self.raw_decode(s)
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 416, in raw_decode
    return self.scan_once(s, idx=_w(s, idx).end())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
simplejson.errors.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 77, in <module>
  File "<string>", line 18, in test_get_document_detail
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 978, in json
    raise RequestsJSONDecodeError(e.msg, e.doc, e.pos)
requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/be54ea58-4439-408c-8cdb-1f7b49b4a592
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 post api users create user
- **Test Code:** [TC008_post_api_users_create_user.py](./TC008_post_api_users_create_user.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 974, in json
    return complexjson.loads(self.text, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/__init__.py", line 514, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 386, in decode
    obj, end = self.raw_decode(s)
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 416, in raw_decode
    return self.scan_once(s, idx=_w(s, idx).end())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
simplejson.errors.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "<string>", line 21, in test_post_api_users_create_user
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 978, in json
    raise RequestsJSONDecodeError(e.msg, e.doc, e.pos)
requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 118, in <module>
  File "<string>", line 23, in test_post_api_users_create_user
AssertionError: Signin response is not valid JSON

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/f6727a62-35db-4068-8735-a7d68663f122
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 get api users list all users
- **Test Code:** [TC009_get_api_users_list_all_users.py](./TC009_get_api_users_list_all_users.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 974, in json
    return complexjson.loads(self.text, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/__init__.py", line 514, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 386, in decode
    obj, end = self.raw_decode(s)
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 416, in raw_decode
    return self.scan_once(s, idx=_w(s, idx).end())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
simplejson.errors.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "<string>", line 18, in test_get_api_users_list_all_users
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 978, in json
    raise RequestsJSONDecodeError(e.msg, e.doc, e.pos)
requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 51, in <module>
  File "<string>", line 49, in test_get_api_users_list_all_users
AssertionError: Request failed: Expecting value: line 1 column 1 (char 0)

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/44441cf5-32d9-408f-a460-b98f31d411f7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get api roles list roles
- **Test Code:** [TC010_get_api_roles_list_roles.py](./TC010_get_api_roles_list_roles.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 974, in json
    return complexjson.loads(self.text, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/__init__.py", line 514, in loads
    return _default_decoder.decode(s)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 386, in decode
    obj, end = self.raw_decode(s)
               ^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/site-packages/simplejson/decoder.py", line 416, in raw_decode
    return self.scan_once(s, idx=_w(s, idx).end())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
simplejson.errors.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "<string>", line 15, in test_get_roles_list_with_valid_authorization
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 978, in json
    raise RequestsJSONDecodeError(e.msg, e.doc, e.pos)
requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 39, in <module>
  File "<string>", line 37, in test_get_roles_list_with_valid_authorization
AssertionError: Request failed: Expecting value: line 1 column 1 (char 0)

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dd505f31-041c-4470-bb37-623e6dc3ce0b/dd69ae5f-ded6-431c-8093-96b810cae487
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---