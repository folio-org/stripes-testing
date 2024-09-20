export default {
  Consortia: 'consortium',
  University: 'university',
  // School: 'cs00000int_0003',
  College: 'college',
};

export const tenantNames = {
  central: 'Consortium',
  college: 'College',
  university: 'University',
  professional: 'University', // evrk2 only has 2 member tenants, so re-using MT2 here
  // school: 'School',
  // special: 'Special,',
};

export const tenantCodes = {
  central: 'MCO',
  college: 'COL',
  university: 'UNI',
  professional: 'UNI', // evrk2 only has 2 member tenants, so re-using MT2 here
  // school: 'SCHO',
  // special: 'SPE,',
};

export const tenantErrors = {
  code: 'The code must not be longer than 5 characters alphanumeric.',
  name: 'Tenant name must not be longer than 150 characters.',
};

export const adminUsernames = {
  college: 'college_admin',
  university: 'university_admin',
};
