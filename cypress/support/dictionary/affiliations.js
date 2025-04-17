const currentEnv = Cypress.env('ecs_env_name');

export default {
  bugfest: {
    Consortia: 'cs00000int',
    University: 'cs00000int_0005',
    School: 'cs00000int_0003',
    College: 'cs00000int_0001',
  },
  LoC: {
    Consortia: 'cs01000001',
    University: 'cs01000001m0005',
    College: 'cs01000001m0001',
  },
}[currentEnv];

export const tenantNames = {
  bugfest: {
    central: 'Central Office',
    college: 'College',
    university: 'University',
    professional: 'Professional',
    school: 'School',
    special: 'Special,',
  },
  LoC: {
    central: 'Central Tenant',
    college: 'General Collections',
    university: 'Congressional',
  },
}[currentEnv];

export const tenantCodes = {
  bugfest: {
    central: 'CEN',
    college: 'COL',
    university: 'UNI',
    professional: 'PROF',
    school: 'SCHO',
    special: 'SPE,',
  },
  LoC: {
    central: 'dt0',
    college: 'dt1',
    university: 'dt5',
  },
}[currentEnv];

export const tenantErrors = {
  code: 'The code must not be longer than 5 characters alphanumeric.',
  name: 'Tenant name must not be longer than 150 characters.',
};

export const adminUsernames = {
  college: 'ecs_0001_admin',
  university: 'ecs_0005_admin',
};
