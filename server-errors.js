// Arabic wording for the backend's English error texts (sign-in, registration, password and e-mail flows).
// Shared by index.html, verify.html and reset-password.html; loaded as server-errors.js?v=N — bump N when this
// file changes so phones don't keep a cached copy. Texts are matched exactly as the server sends them
// (src/controllers/auth.controller.js, src/utils/credentials.js, src/index.js limiters, src/middleware/errorHandler.js).
// Anything not listed is shown as it is. Only the display is translated: callers keep comparing the original
// English text in their logic.
(function () {
  var KEYS = {
    'Invalid credentials': 'invalidCredentials',
    'Please verify your email before logging in': 'verifyEmailFirst',
    'This account has been deactivated': 'accountDeactivated',
    'Account deactivated': 'accountDeactivated',
    'Email already registered': 'emailTaken',
    'You must accept the Terms of Service and Privacy Policy': 'acceptTerms',
    'email is required': 'emailRequired',
    'email and password required': 'emailPasswordRequired',
    'email, password, role and companyName are required': 'fillRequired',
    'email is not a valid email address': 'emailInvalid',
    'role must be BUYER or SUPPLIER': 'roleInvalid',
    'password must be at least 8 characters': 'passwordShort',
    'newPassword must be at least 8 characters': 'passwordShort',
    'password is too long': 'passwordLong',
    'newPassword is too long': 'passwordLong',
    'token and newPassword are required': 'tokenPasswordRequired',
    'Token is required': 'tokenRequired',
    'Invalid or expired token': 'tokenInvalid',
    'Token has expired': 'tokenExpired',
    'Current password is incorrect': 'currentPasswordWrong',
    'currentPassword and newPassword are required': 'bothPasswordsRequired',
    'password and companyName are required': 'passwordCompanyRequired',
    'Company name does not match': 'companyNameMismatch',
    'Account cannot be deleted yet': 'cannotDeleteYet',
    'Too many login attempts, please try again later.': 'tooManyLogin',
    'Too many registration attempts, please try again later.': 'tooManyRegister',
    'Too many password reset requests, please try again later.': 'tooManyReset',
    'Too many verification email requests, please try again later.': 'tooManyVerification',
    'Too many requests, please try again later.': 'tooMany',
    'Internal server error': 'serverError'
  };
  var AR = {
    invalidCredentials: 'بيانات الدخول غير صحيحة',
    verifyEmailFirst: 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول',
    accountDeactivated: 'تم تعطيل هذا الحساب',
    emailTaken: 'هذا البريد الإلكتروني مسجّل مسبقًا',
    acceptTerms: 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية',
    emailRequired: 'البريد الإلكتروني مطلوب',
    emailPasswordRequired: 'البريد الإلكتروني وكلمة المرور مطلوبان',
    fillRequired: 'يرجى تعبئة جميع الحقول المطلوبة',
    emailInvalid: 'البريد الإلكتروني غير صحيح',
    roleInvalid: 'يجب اختيار نوع الحساب: مشترٍ أو مورّد',
    passwordShort: 'يجب ألا تقل كلمة المرور عن 8 أحرف',
    passwordLong: 'كلمة المرور طويلة جدًا',
    tokenPasswordRequired: 'الرمز وكلمة المرور الجديدة مطلوبان',
    tokenRequired: 'الرمز مطلوب',
    tokenInvalid: 'الرمز غير صالح أو منتهي الصلاحية',
    tokenExpired: 'انتهت صلاحية الرمز',
    currentPasswordWrong: 'كلمة المرور الحالية غير صحيحة',
    bothPasswordsRequired: 'كلمة المرور الحالية والجديدة مطلوبتان',
    passwordCompanyRequired: 'كلمة المرور واسم الشركة مطلوبان',
    companyNameMismatch: 'اسم الشركة غير مطابق',
    cannotDeleteYet: 'لا يمكن حذف الحساب حاليًا',
    tooManyLogin: 'محاولات دخول كثيرة، حاول مرة أخرى لاحقًا',
    tooManyRegister: 'محاولات تسجيل كثيرة، حاول مرة أخرى لاحقًا',
    tooManyReset: 'طلبات إعادة تعيين كثيرة، حاول مرة أخرى لاحقًا',
    tooManyVerification: 'طلبات إرسال بريد التأكيد كثيرة، حاول مرة أخرى لاحقًا',
    tooMany: 'طلبات كثيرة، حاول مرة أخرى لاحقًا',
    serverError: 'حدث خطأ في الخادم، حاول مرة أخرى لاحقًا',
    accountSuspended: 'الحساب موقوف'
  };
  var SUSPENDED_PREFIX = 'Account suspended: ';

  // English (or an unknown language): the server text unchanged. Arabic: the translation when the text is known.
  function serverError(text, lang) {
    if (lang !== 'ar' || typeof text !== 'string') return text;
    var key = KEYS[text.trim()];
    if (key) return AR[key];
    if (text.indexOf(SUSPENDED_PREFIX) === 0) return AR.accountSuspended + ': ' + text.slice(SUSPENDED_PREFIX.length); // the reason stays as written
    return text;
  }

  // Message of a failed fetch response: the JSON { error } the API sends, or (a proxy, an unexpected middleware)
  // a short plain-text body. '' when there is nothing usable, so callers can fall back to their own wording.
  function readServerError(res) {
    return res.text().then(function (raw) {
      try { var data = JSON.parse(raw); if (data && typeof data.error === 'string') return data.error; } catch (e) {}
      var s = String(raw || '').trim();
      return s && s.length <= 200 && s.indexOf('<') === -1 ? s : '';
    }, function () { return ''; });
  }

  window.serverError = serverError;
  window.readServerError = readServerError;
})();
