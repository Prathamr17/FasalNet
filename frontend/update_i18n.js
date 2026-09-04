const fs = require('fs');

function updateJson(file, data) {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  function merge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], merge(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
  }
  
  merge(content, data);
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
}

const en = {
  home: {
    badge: "AgriTech · Built for India's Farmers",
    title_1: "Connect Farmers to",
    title_2: "Cold Storage",
    title_3: "instantly.",
    subtitle: "India loses ₹17.7B/year to post-harvest spoilage. FasalNet gives every farmer instant access to the nearest cold storage — before the loss happens.",
    go_to: "Go to",
    get_started: "Get Started Free",
    features: ["✓ No hidden fees", "✓ Works on 2G", "✓ 3 Languages", "✓ ML-powered risk"],
    stats: [
      {num: "₹17B", label: "Annual Loss Prevented", sub: "post-harvest food waste"},
      {num: "25+", label: "Cold Storages", sub: "across India"},
      {num: "<60s", label: "Book Storage", sub: "one-tap booking"},
      {num: "3", label: "Languages", sub: "EN / हिं / मराठी"}
    ],
    roles_title: "Built for Everyone in the Chain",
    roles: [
      {label: "Farmer", desc: "Upload produce, book cold storage, track risk in real time"},
      {label: "Operator", desc: "Manage bookings, update capacity, approve orders"},
      {label: "Customer", desc: "Browse marketplace, buy fresh produce, track your orders"}
    ],
    steps_title: "How It Works",
    steps: [
      {title: "Enter Crop Details", desc: "Tell us your crop type, harvest age and quantity."},
      {title: "Get ML Risk Score", desc: "Our Random Forest model rates spoilage: SAFE, RISKY, or CRITICAL."},
      {title: "Find Cold Storage", desc: "Map view with ranked cold storage options across India."},
      {title: "Book Instantly", desc: "One-tap booking. Operator confirms in real time."}
    ],
    cta_title: "Ready to save your harvest?",
    cta_sub: "Join farmers, operators and buyers across India on FasalNet.",
    cta_btn: "Sign Up Free →"
  },
  auth: {
    email_placeholder: "you@email.com",
    password_placeholder: "Min 6 characters",
    confirm_password: "Confirm Password",
    reset_password: "Reset Password",
    reset_subtitle: "Enter your email to get a reset OTP",
    create_new_password: "Create your new password",
    password_reset_success: "Password Reset!",
    redirecting: "Redirecting to login...",
    back_to_login: "← Back to Login",
    send_otp: "Send OTP →",
    resetting: "Resetting...",
    name: "Full Name",
    phone: "Phone Number",
    email: "Email (optional)",
    password: "Password",
    login_btn: "Login",
    signup_btn: "Create Account",
    no_account: "Don't have an account?",
    have_account: "Already have an account?",
    forgot_password: "Forgot Password?",
    sign_in: "Sign In",
    sign_up: "Sign Up",
    or: "or",
    google_login: "Continue with Google",
    quick_login: "Quick Login — Demo Accounts",
    login_title: "Welcome Back",
    invalid_creds: "Invalid phone or password",
    sending_otp: "Sending OTP...",
    back: "← Back",
    continue_as: "Continue as",
    join_title: "Join FasalNet",
    choose_role: "Choose your role to get started",
    cold_storage_step: "Tell us about your cold storage facility",
    setting_up: "Setting up your account",
    cold_storage_details: "Cold Storage Details",
    preferred_language: "Preferred Language",
    upload_produce: "Upload produce & book cold storage",
    manage_facility: "Manage cold storage facility",
    phone_placeholder: "10-digit mobile number",
    farmer: "Farmer",
    operator: "Storage Operator",
    customer: "Buyer / Customer",
    district: "District",
    state: "State"
  }
};

const hi = {
  home: {
    badge: "एग्रीटेक · भारत के किसानों के लिए",
    title_1: "किसानों को",
    title_2: "कोल्ड स्टोरेज",
    title_3: "से तुरंत जोड़ें।",
    subtitle: "फसल खराब होने से भारत को हर साल ₹17.7B का नुकसान होता है। FasalNet हर किसान को नुकसान होने से पहले सबसे नजदीकी कोल्ड स्टोरेज तक पहुंच प्रदान करता है।",
    go_to: "पर जाएं",
    get_started: "मुफ्त में शुरू करें",
    features: ["✓ कोई छिपी हुई फीस नहीं", "✓ 2G पर काम करता है", "✓ 3 भाषाएं", "✓ ML-आधारित जोखिम"],
    stats: [
      {num: "₹17B", label: "सालाना नुकसान रोका गया", sub: "कटाई के बाद खाने की बर्बादी"},
      {num: "25+", label: "कोल्ड स्टोरेज", sub: "पूरे भारत में"},
      {num: "<60s", label: "स्टोरेज बुक करें", sub: "वन-टैप बुकिंग"},
      {num: "3", label: "भाषाएं", sub: "EN / हिं / मराठी"}
    ],
    roles_title: "चेन में सभी के लिए बनाया गया",
    roles: [
      {label: "किसान", desc: "उपज अपलोड करें, कोल्ड स्टोरेज बुक करें, रीयल-टाइम में जोखिम ट्रैक करें"},
      {label: "ऑपरेटर", desc: "बुकिंग प्रबंधित करें, क्षमता अपडेट करें, ऑर्डर स्वीकृत करें"},
      {label: "ग्राहक", desc: "बाज़ार ब्राउज़ करें, ताज़ी उपज खरीदें, अपने ऑर्डर ट्रैक करें"}
    ],
    steps_title: "यह कैसे काम करता है",
    steps: [
      {title: "फसल का विवरण दर्ज करें", desc: "हमें अपनी फसल का प्रकार, कटाई की उम्र और मात्रा बताएं।"},
      {title: "ML जोखिम स्कोर प्राप्त करें", desc: "हमारा रैंडम फॉरेस्ट मॉडल खराब होने का मूल्यांकन करता है: सुरक्षित, जोखिम या गंभीर।"},
      {title: "कोल्ड स्टोरेज खोजें", desc: "पूरे भारत में कोल्ड स्टोरेज विकल्पों के साथ मैप व्यू।"},
      {title: "तुरंत बुक करें", desc: "वन-टैप बुकिंग। ऑपरेटर रीयल-टाइम में पुष्टि करता है।"}
    ],
    cta_title: "क्या आप अपनी फसल बचाने के लिए तैयार हैं?",
    cta_sub: "FasalNet पर पूरे भारत के किसानों, ऑपरेटरों और खरीदारों से जुड़ें।",
    cta_btn: "मुफ्त साइन अप करें →"
  },
  auth: {
    email_placeholder: "you@email.com",
    password_placeholder: "न्यूनतम 6 अक्षर",
    confirm_password: "पासवर्ड की पुष्टि करें",
    reset_password: "पासवर्ड रीसेट करें",
    reset_subtitle: "रीसेट OTP प्राप्त करने के लिए अपना ईमेल दर्ज करें",
    create_new_password: "अपना नया पासवर्ड बनाएं",
    password_reset_success: "पासवर्ड रीसेट हो गया!",
    redirecting: "लॉगिन पर रीडायरेक्ट कर रहा है...",
    back_to_login: "← लॉगिन पर वापस",
    send_otp: "OTP भेजें →",
    resetting: "रीसेट कर रहा है...",
    name: "पूरा नाम",
    phone: "फोन नंबर",
    email: "ईमेल (वैकल्पिक)",
    password: "पासवर्ड",
    login_btn: "लॉगिन",
    signup_btn: "खाता बनाएं",
    no_account: "खाता नहीं है?",
    have_account: "पहले से खाता है?",
    forgot_password: "पासवर्ड भूल गए?",
    sign_in: "साइन इन",
    sign_up: "साइन अप",
    or: "या",
    google_login: "Google से जारी रखें",
    quick_login: "त्वरित लॉगिन — डेमो खाते",
    login_title: "वापस स्वागत है",
    invalid_creds: "अमान्य फोन या पासवर्ड",
    sending_otp: "OTP भेज रहा है...",
    back: "← वापस",
    continue_as: "के रूप में जारी रखें",
    join_title: "FasalNet से जुड़ें",
    choose_role: "शुरू करने के लिए अपनी भूमिका चुनें",
    cold_storage_step: "अपनी कोल्ड स्टोरेज सुविधा के बारे में बताएं",
    setting_up: "अपना खाता सेट कर रहा है",
    cold_storage_details: "कोल्ड स्टोरेज विवरण",
    preferred_language: "पसंदीदा भाषा",
    upload_produce: "उपज अपलोड करें और कोल्ड स्टोरेज बुक करें",
    manage_facility: "कोल्ड स्टोरेज सुविधा प्रबंधित करें",
    phone_placeholder: "10-अंकीय मोबाइल नंबर",
    farmer: "किसान",
    operator: "स्टोरेज ऑपरेटर",
    customer: "खरीदार",
    district: "जिला",
    state: "राज्य"
  }
};

const mr = {
  home: {
    badge: "अॅग्रीटेक · भारताच्या शेतकऱ्यांसाठी",
    title_1: "शेतकऱ्यांना",
    title_2: "कोल्ड स्टोरेज",
    title_3: "शी त्वरित जोडा.",
    subtitle: "काढणीनंतरच्या नुकसानीमुळे भारताला दरवर्षी ₹17.7B चा फटका बसतो. FasalNet प्रत्येक शेतकऱ्याला नुकसान होण्यापूर्वीच जवळच्या कोल्ड स्टोरेजमध्ये प्रवेश देते.",
    go_to: "वर जा",
    get_started: "मोफत सुरू करा",
    features: ["✓ कोणतेही छुपे शुल्क नाही", "✓ 2G वर चालते", "✓ 3 भाषा", "✓ ML-आधारित धोका"],
    stats: [
      {num: "₹17B", label: "वार्षिक नुकसान टळले", sub: "काढणीनंतरचे अन्न वाया जाणे"},
      {num: "25+", label: "कोल्ड स्टोरेज", sub: "संपूर्ण भारतात"},
      {num: "<60s", label: "स्टोरेज बुक करा", sub: "वन-टॅप बुकिंग"},
      {num: "3", label: "भाषा", sub: "EN / हिं / मराठी"}
    ],
    roles_title: "साखळीतील प्रत्येकासाठी बनवलेले",
    roles: [
      {label: "शेतकरी", desc: "शेतमाल अपलोड करा, कोल्ड स्टोरेज बुक करा, रिअल-टाइममध्ये धोका ट्रॅक करा"},
      {label: "ऑपरेटर", desc: "बुकिंग व्यवस्थापित करा, क्षमता अपडेट करा, ऑर्डर मंजूर करा"},
      {label: "ग्राहक", desc: "बाजारपेठ ब्राउझ करा, ताजी उत्पादने खरेदी करा, तुमचे ऑर्डर ट्रॅक करा"}
    ],
    steps_title: "हे कसे कार्य करते",
    steps: [
      {title: "पिकाचा तपशील प्रविष्ट करा", desc: "आम्हाला तुमचा पीक प्रकार, काढणीचे वय आणि प्रमाण सांगा."},
      {title: "ML धोका स्कोअर मिळवा", desc: "आमचे रँडम फॉरेस्ट मॉडेल खराब होण्याचे मूल्यांकन करते: सुरक्षित, धोकादायक किंवा गंभीर."},
      {title: "कोल्ड स्टोरेज शोधा", desc: "संपूर्ण भारतातील कोल्ड स्टोरेज पर्यायांसह नकाशा दृश्य."},
      {title: "त्वरित बुक करा", desc: "वन-टॅप बुकिंग. ऑपरेटर रिअल-टाइममध्ये पुष्टी करतो."}
    ],
    cta_title: "तुम्ही तुमचे पीक वाचवण्यासाठी तयार आहात का?",
    cta_sub: "FasalNet वर संपूर्ण भारतातील शेतकरी, ऑपरेटर आणि खरेदीदारांमध्ये सामील व्हा.",
    cta_btn: "मोफत साइन अप करा →"
  },
  auth: {
    email_placeholder: "you@email.com",
    password_placeholder: "किमान 6 अक्षरे",
    confirm_password: "पासवर्डची पुष्टी करा",
    reset_password: "पासवर्ड रीसेट करा",
    reset_subtitle: "रीसेट OTP मिळवण्यासाठी तुमचा ईमेल प्रविष्ट करा",
    create_new_password: "तुमचा नवीन पासवर्ड तयार करा",
    password_reset_success: "पासवर्ड रीसेट झाला!",
    redirecting: "लॉगिनवर पुनर्निर्देशित करत आहे...",
    back_to_login: "← लॉगिनवर परत",
    send_otp: "OTP पाठवा →",
    resetting: "रीसेट करत आहे...",
    name: "पूर्ण नाव",
    phone: "फोन नंबर",
    email: "ईमेल (पर्यायी)",
    password: "पासवर्ड",
    login_btn: "लॉगिन",
    signup_btn: "खाते तयार करा",
    no_account: "खाते नाही?",
    have_account: "आधीच खाते आहे?",
    forgot_password: "पासवर्ड विसरलात?",
    sign_in: "साइन इन",
    sign_up: "साइन अप",
    or: "किंवा",
    google_login: "Google सह सुरू ठेवा",
    quick_login: "द्रुत लॉगिन — डेमो खाती",
    login_title: "पुन्हा स्वागत आहे",
    invalid_creds: "अवैध फोन किंवा पासवर्ड",
    sending_otp: "OTP पाठवत आहे...",
    back: "← मागे",
    continue_as: "म्हणून पुढे जा",
    join_title: "फसलनेट मध्ये सामील व्हा",
    choose_role: "प्रारंभ करण्यासाठी तुमची भूमिका निवडा",
    cold_storage_step: "तुमच्या कोल्ड स्टोरेज सुविधेबद्दल सांगा",
    setting_up: "तुमचे खाते सेट करत आहे",
    cold_storage_details: "कोल्ड स्टोरेज तपशील",
    preferred_language: "पसंतीची भाषा",
    upload_produce: "शेतमाल अपलोड करा आणि कोल्ड स्टोरेज बुक करा",
    manage_facility: "कोल्ड स्टोरेज सुविधा व्यवस्थापित करा",
    phone_placeholder: "10-अंकी मोबाइल नंबर",
    farmer: "शेतकरी",
    operator: "स्टोरेज ऑपरेटर",
    customer: "खरेदीदार",
    district: "जिल्हा",
    state: "राज्य"
  }
};

updateJson('./src/i18n/en.json', en);
updateJson('./src/i18n/hi.json', hi);
updateJson('./src/i18n/mr.json', mr);
