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
