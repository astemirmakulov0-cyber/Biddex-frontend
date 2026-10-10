// Arabic wording for the backend's English error texts (sign-in, registration, password and e-mail flows).
// Shared by index.html, bid.html, accept-invite.html, verify.html and reset-password.html; loaded as server-errors.js?v=N — bump N when this
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
    'Internal server error': 'serverError',
    // bid links (bid.html) and quotes
    'This link is not valid or is no longer active': 'linkInvalid',
    'RFQ is not open for quotes': 'rfqNotOpen',
    'The deadline for this RFQ has passed': 'deadlinePassed',
    'This quote can no longer be changed': 'quoteLocked',
    'A quote from your company already exists for this request': 'quoteExists',
    'You have already submitted a quote for this RFQ': 'quoteExists',
    'Insufficient bid credits': 'noCredits',
    'unitPrice must be a positive number': 'priceInvalid',
    'unitPrice can have at most 3 decimal places': 'priceDecimals',
    'The quote total (unit price × quantity) is too large': 'totalTooLarge',
    'deliveryTimeDays must be a whole number between 0 and 365': 'deliveryInvalid',
    'paymentTermsDays must be a whole number between 0 and 120': 'termsInvalid',
    'notes must be text of at most 1000 characters': 'notesInvalid',
    'Your role in this company does not allow this action': 'roleDenied',
    'You are no longer a member of this company': 'notMember',
    'Forbidden: insufficient role': 'forbiddenRole',
    'Teams are only available for buyer companies for now': 'teamsBuyerOnly',
    'Invitation not found': 'inviteNotFound',
    'Person not found': 'personNotFound',
    'You are not in this company': 'notInCompany',
    'You are not in a company': 'notInACompany',
    'This company is not active': 'companyNotActive',
    'This person is already in your company': 'alreadyInCompany',
    'An invitation to this address is already open; resend it instead': 'inviteOpen',
    'Please wait a minute before sending it again': 'waitMinute',
    'This invitation was sent too many times; cancel it and invite again': 'inviteSentTooMany',
    'Too many invitations today; try again tomorrow': 'invitesToday',
    'Use "Leave the company" to remove yourself': 'useLeave',
    'A company needs at least one owner': 'needOwner',
    'You are the last owner of this company: make someone else an owner first, or delete the company': 'lastOwner',
    'role must be MANAGER or STAFF': 'roleInvite',
    'role must be OWNER, MANAGER or STAFF': 'roleAny',
    'This e-mail address already belongs to another Biddex account. Ask your company owner to invite a different address.': 'inviteEmailInUse',
    'This company has reached its limit of people': 'peopleLimit',
    'password is required': 'passwordRequired',
    'Request body is too large': 'bodyTooLarge',
    'Invalid JSON body': 'badJson'
  };
  var AR = {
    roleDenied: 'دورك في هذه الشركة لا يسمح بهذا الإجراء',
    notMember: 'لم تعد عضوًا في هذه الشركة',
    forbiddenRole: 'ليست لديك صلاحية لهذا الإجراء',
    teamsBuyerOnly: 'الفرق متاحة لشركات المشترين فقط حاليًا',
    inviteNotFound: 'الدعوة غير موجودة',
    personNotFound: 'الشخص غير موجود',
    notInCompany: 'أنت لست في هذه الشركة',
    notInACompany: 'أنت لست في شركة',
    companyNotActive: 'هذه الشركة غير نشطة',
    alreadyInCompany: 'هذا الشخص موجود في شركتك بالفعل',
    inviteOpen: 'توجد دعوة مفتوحة لهذا العنوان؛ أعد إرسالها بدلًا من ذلك',
    waitMinute: 'يرجى الانتظار دقيقة قبل الإرسال مرة أخرى',
    inviteSentTooMany: 'أُرسلت هذه الدعوة مرات كثيرة؛ ألغِها وادعُ الشخص من جديد',
    invitesToday: 'دعوات كثيرة اليوم؛ حاول غدًا',
    useLeave: 'استخدم «مغادرة الشركة» لإزالة نفسك',
    needOwner: 'تحتاج الشركة إلى مالك واحد على الأقل',
    lastOwner: 'أنت آخر مالك لهذه الشركة: اجعل شخصًا آخر مالكًا أولًا، أو احذف الشركة',
    roleInvite: 'يجب أن يكون الدور مديرًا أو موظفًا',
    roleAny: 'يجب أن يكون الدور مالكًا أو مديرًا أو موظفًا',
    inviteEmailInUse: 'هذا البريد الإلكتروني يخص حسابًا آخر في Biddex. اطلب من مالك شركتك دعوة عنوان مختلف.',
    peopleLimit: 'بلغت هذه الشركة الحد الأقصى لعدد الأشخاص',
    passwordRequired: 'كلمة المرور مطلوبة',
    bodyTooLarge: 'حجم الطلب كبير جدًا',
    badJson: 'تعذّرت قراءة الطلب',
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
    accountSuspended: 'الحساب موقوف',
    linkInvalid: 'هذا الرابط غير صالح أو لم يعد نشطًا',
    rfqNotOpen: 'طلب التسعير غير مفتوح لتلقي العروض',
    deadlinePassed: 'انتهى الموعد النهائي لهذا الطلب',
    quoteLocked: 'لا يمكن تعديل هذا العرض بعد الآن',
    quoteExists: 'يوجد عرض من شركتك على هذا الطلب مسبقًا',
    noCredits: 'رصيد العروض غير كافٍ',
    priceInvalid: 'يجب أن يكون سعر الوحدة رقمًا موجبًا',
    priceDecimals: 'يجب ألا يزيد سعر الوحدة عن ثلاث خانات عشرية',
    totalTooLarge: 'إجمالي العرض كبير جدًا',
    deliveryInvalid: 'يجب أن تكون مدة التوصيل عددًا صحيحًا بين 0 و365',
    termsInvalid: 'يجب أن تكون شروط الدفع عددًا صحيحًا بين 0 و120',
    notesInvalid: 'يجب ألا تتجاوز الملاحظات 1000 حرف'
  };
  // Input checks (src/utils/validate.js, money.js): the English texts have a few fixed shapes, so they are translated by
  // shape; the field name is shown in Arabic when it is known here, as it is otherwise. Exact texts in KEYS win.
  var FIELDS = {
    title: 'العنوان', description: 'الوصف', quantity: 'الكمية', unit: 'الوحدة', specifications: 'المواصفات', brand: 'العلامة التجارية',
    companyName: 'اسم الشركة', name: 'الاسم', country: 'الدولة', address: 'عنوان الشركة', phone: 'الهاتف', registrationNumber: 'رقم السجل التجاري',
    notes: 'الملاحظات', terms: 'الشروط', trackingInfo: 'معلومات التتبع', body: 'الرسالة', category: 'الفئة', reference: 'المرجع',
    password: 'كلمة المرور', currentPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة', reason: 'السبب', comment: 'التعليق', q: 'نص البحث',
    publish: 'النشر', isActive: 'الحالة', exactBrandOnly: 'العلامة التجارية بالضبط', productId: 'المنتج', duplicateFromId: 'المنتج', companyId: 'الشركة',
    fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', role: 'الدور', consent: 'الموافقة', deliveryTimeDays: 'مدة التسليم', paymentTermsDays: 'مهلة الدفع', price: 'السعر', unitPrice: 'سعر الوحدة', budget: 'الميزانية', amount: 'المبلغ'
  };
  var field = function (f) { return '«' + (FIELDS[f] || f) + '»'; };
  var SHAPES = [
    [/^(\w+) must be at most (\d+) characters$/, function (m) { return 'يجب ألا يزيد الحقل ' + field(m[1]) + ' عن ' + m[2] + ' حرفًا'; }],
    [/^(\w+) must be text$/, function (m) { return 'يجب أن يكون الحقل ' + field(m[1]) + ' نصًا'; }],
    [/^(\w+) is required$/, function (m) { return 'الحقل ' + field(m[1]) + ' مطلوب'; }],
    [/^(\w+) must be a whole number between (\d+) and (\d+)$/, function (m) { return 'يجب أن يكون الحقل ' + field(m[1]) + ' عددًا صحيحًا بين ' + m[2] + ' و' + m[3]; }],
    [/^(\w+) must be true or false$/, function (m) { return 'يجب أن تكون قيمة الحقل ' + field(m[1]) + ' نعم أو لا'; }],
    [/^(\w+) must be a positive number$/, function (m) { return 'يجب أن يكون الحقل ' + field(m[1]) + ' رقمًا أكبر من صفر'; }],
    [/^(\w+) can have at most 3 decimal places$/, function (m) { return 'يمكن أن يحتوي الحقل ' + field(m[1]) + ' على 3 خانات عشرية كحد أقصى'; }],
    [/^A company can have at most (\d+) owners$/, function (m) { return 'يمكن أن يكون للشركة ' + m[1] + ' ملّاك كحد أقصى'; }],
    [/^At most (\d+) invitations can be open at once$/, function (m) { return 'يمكن فتح ' + m[1] + ' دعوات كحد أقصى في الوقت نفسه'; }],
    [/^Your company can have at most (\d+) people, invitations included$/, function (m) { return 'يمكن أن يضم حسابك ' + m[1] + ' أشخاص كحد أقصى، بما في ذلك الدعوات'; }],
    [/^(\w+) is too large$/, function (m) { return 'قيمة الحقل ' + field(m[1]) + ' كبيرة جدًا'; }]
  ];

  var SUSPENDED_PREFIX = 'Account suspended: ';

  // English (or an unknown language): the server text unchanged. Arabic: the translation when the text is known.
  function serverError(text, lang) {
    if (lang !== 'ar' || typeof text !== 'string') return text;
    var key = KEYS[text.trim()];
    if (key) return AR[key];
    if (text.indexOf(SUSPENDED_PREFIX) === 0) return AR.accountSuspended + ': ' + text.slice(SUSPENDED_PREFIX.length); // the reason stays as written
    var trimmed = text.trim();
    for (var i = 0; i < SHAPES.length; i++) { var m = SHAPES[i][0].exec(trimmed); if (m) return SHAPES[i][1](m); }
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
