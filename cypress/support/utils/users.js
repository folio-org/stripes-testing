// eslint-disable-next-line import/prefer-default-export
export const getFullName = (user) => {
  let fullName = user?.personal?.lastName ?? '';
  let givenName = user?.personal?.preferredFirstName ?? user?.personal?.firstName ?? '';
  const middleName = user?.personal?.middleName ?? '';
  if (middleName) {
    givenName += `${givenName ? ' ' : ''}${middleName}`;
  }

  if (givenName) {
    fullName += `${fullName ? ', ' : ''}${givenName}`;
  }

  return fullName;
};

export const getAdminSourceRecord = () => cy
  .getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` })
  .then((user) => {
    const { lastName, firstName } = user[0].personal;
    return `${lastName}${(firstName && `, ${firstName}`) || ''}`;
  })
  .then((record) => {
    Cypress.env('adminSourceRecord', record);
    return record;
  });
