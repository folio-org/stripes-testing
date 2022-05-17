
export default {
  updateUserAddress:(user, addresses) => {
    cy.updateUser({
      ...user,
      personal: {
        lastName: '',
        addresses
      }
    });
  }
};

