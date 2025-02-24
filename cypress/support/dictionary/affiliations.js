const currentEnv = Cypress.env('ECS_ENV_NAME');

export default {
  sprint: {
    Consortia: 'cs00000int',
    University: 'cs00000int_0005',
    School: 'cs00000int_0003',
    College: 'cs00000int_0001',
  },
  cypress: {
    Consortia: 'consortium',
    University: 'university',
    College: 'college',
  },
}[currentEnv];

export const tenantNames = {
  sprint: {
    central: 'Central tenant',
    college: 'Colleague tenant',
    university: 'University tenant',
    professional: 'Professional tenant',
    school: 'School tenant',
    special: 'Special tenant',
  },
  cypress: {
    central: 'Consortium',
    college: 'College',
    university: 'University',
    professional: 'University',
  },
}[currentEnv];

export const tenantCodes = {
  sprint: {
    central: 'CEN',
    college: 'COL',
    university: 'UNI',
    professional: 'PROF',
    school: 'SCHO',
    special: 'SPE,',
  },
  cypress: {
    central: 'MCO',
    college: 'COL',
    university: 'UNI',
    professional: 'UNI',
  },
}[currentEnv];

export const tenantErrors = {
  code: 'The code must not be longer than 5 characters alphanumeric.',
  name: 'Tenant name must not be longer than 150 characters.',
};

export const adminUsernames = {
  college: 'college_admin',
  university: 'university_admin',
};
