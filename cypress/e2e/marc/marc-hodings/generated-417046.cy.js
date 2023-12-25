describe('MARC Authority', () => {
  before('Create test data', () => {
    /*
    User is logged with following permissions:
    * MARC Authority: View MARC authority record
    * MARC Authority: Edit MARC authority record
    * quickMARC: View, edit MARC authorities record
    MARC authority record exists in the MARC authority app.
    The "MARC Authority" app opened and displays the MARC Authority record details
    */

    cy.getAdminToken().then(() => {
      // create all test objects
    });
  });

  // after('Delete test data', () => {
  //   /* delete all test objects created in precondition if possible */
  //   Users.deleteViaApi(testData.user.userId);
  // });

  it(
    'C417046 Update MARC Authority via MARC Auth app; check for updated 005 (folijet) (TaaS)',
    { tags: ['criticalPath', 'folijet'] },
    () => {
      // #1 Click on "Actions" button -> select "Edit"
      // "Edit MARC authority record" page is displayed
      // #2 Update any field (e.g. add "test" to 035 field)
      // Data in the record corresponds to the entered data
      // #3 Click "Save & close" button
      // A green message box should appear stating "This record has successfully saved and is in process. Changes may not appear immediately." and you should be returned to the instance record
      // #4 Verify that the 005 field has been updated in the MARC Authority record details
      // The 005 field is updated with the date and time when last changes were applied
      // See https://www.loc.gov/marc/authority/ad005.html for examples and details of formatting for the 005 field
    },
  );
});
