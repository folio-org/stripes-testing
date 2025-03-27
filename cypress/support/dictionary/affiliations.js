const currentEnv = Cypress.env('ecs_env_name');

export default {
  sunflower: {
    Consortia: 'cs00000int',
    University: 'cs00000int_0005',
    School: 'cs00000int_0003',
    College: 'cs00000int_0001',
  },
  sprint: {
    Consortia: 'cs00000int',
    University: 'cs00000int_0005',
    School: 'cs00000int_0003',
    College: 'cs00000int_0001',
  },
  snapshot: {
    Consortia: 'consortium',
    University: 'university',
    College: 'college',
  },
}[currentEnv];

export const tenantNames = {
  sunflower: {
    central: 'Central Office',
    college: 'College',
    university: 'University',
    professional: 'University',
  },
  sprint: {
    central: 'Central tenant',
    college: 'Colleague tenant',
    university: 'University tenant',
    professional: 'Professional tenant',
    school: 'School tenant',
    special: 'Special tenant',
  },
  snapshot: {
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
  snapshot: {
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
