describe('Reporting | MARC authority', () => {
  before('Create test data', () => {
    /*
    * Authorized user with the following permissions:
     * "MARC Authority: View MARC authority record"
     * "MARC Authority: Edit MARC authority record"
     * "quickMARC: View, edit MARC authorities record"
     * "Inventory: All permissions"
     * "quickMARC: View, edit MARC bibliographic record"
     * "quickMARC: Can Link/unlink authority records to bib records"
     * "Export manager: All"
    * The system must have "MARC Authority" record which controls some fields of "MARC Bibliographic" record.
    * The system must also have "MARC Authority" record which does NOT control any fields of "MARC Bibliographic" record.
    You can use the attached files:
    1) Import "MARC Bibliographic" record via "Data import" app using "Default - Create instance and SRS MARC Bib":
    "MARC_Bib_Beethoven, Ludwig van_240Tag.mrc"
    2) Import "MARC Authority" records via "Data import" app using "Default - Create SRS MARC Authority":
    "MARC_Auth_Beethoven(title).mrc"
    "MARC_Auth_111(Delaware).mrcq"
    3) Create the following links between imported records:
    The "240" MARC field (with the "Variations" value in the "$a" subfield) of imported "MARC Bibliographic" record must be linked to the "100" field of first imported "MARC Authority" record ("Beethoven, Ludwig van").
    **Note**: See the following test case as example how to link "MARC Bib" field to "MARC Authority" record: https://foliotest.testrail.io/index.php?/cases/view/365134
    * User is on the main page of "MARC Authority" app.
    */
  });

  // after('Delete test data', () => {
  //   /* delete all test objects created in precondition if possible */
  //   Users.deleteViaApi(testData.user.userId);
  // });

  it(
    'C375233 "MARC authority headings updates (CSV)" report includes data on several heading updates for the same "MARC authority" record (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      // #1 Input search query that would return controlling "MARC authority" record from precondition → Click "Search" button
      // For example, input "Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major"
      // Search results displayed in second pane
      // #2 Click on "Heading/Reference" for controlling "MARC authority" record from precondition
      // For example, "Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major"
      // Detail view of "MARC authority" record is opened in third pane
      // #3 Click "Actions" button in third pane → Select "Edit" option
      // Edit pane for "MARC authority" record is opened
      // #4 Edit "$a" subfield value in "1XX" field → Click "Save & keep editing" button
      // For example, change "$a" value to "Beethoven, Ludwig the Greatest" in "100" field
      // "Are you sure?" modal appears
      // #5 Click "Save" in modal
      // * Modal is closed
      // * Success toast notification is shown
      // #6 Edit "$a" subfield value in "1XX" field → Click "Save & close" button
      // For example, change "$a" value to "Beethoven, Ludwig the Loudest" in "100" field
      // "Are you sure?" modal appears
      // #7 Click "Save" in modal
      // * Modal is closed
      // * Success toast notification is shown
      // * Edit pane for "MARC authority" record is closed
      // #8 Input search query that would return NOT controlling "MARC authority" record from precondition → Click "Search" button
      // For example, input "Delaware Symposium on Language Studies. Delaware symposia on language studies 1985"
      // Search results displayed in second pane
      // #9 Click on "Heading/Reference" for NOT controlling "MARC authority" record from precondition
      // For example, "Delaware Symposium on Language Studies. Delaware symposia on language studies 1985"
      // Detail view of "MARC authority" record is opened in third pane
      // #10 Click "Actions" button in third pane → Select "Edit" option
      // Edit pane for "MARC authority" record is opened
      // #11 Edit "$a" subfield value in "1XX" field → Click "Save & close" button
      // For example, change "$a" value to "Delaware TEST" in "111" field
      // * Modal is closed
      // * Success toast notification is shown
      // * Edit pane for "MARC authority" record is closed
      // #12 Click "Actions" button in second pane
      // * Actions dropdown menu has expanded
      // * Menu includes "Reports" section with following report options:
      //  * "MARC authority headings updates (CSV)"
      // #13 Select "MARC authority headings updates (CSV)" option
      // "Select date range for MARC authority headings updates (CSV) report" modal appears
      // #14 Choose valid dates in "Start date" and "End date" date pickers
      // For example, choose today as "Start date" and tomorrow as "End date".
      // * Chosen dates are shown in "Start date" and "End date" fields
      // * "Export" button becomes enabled
      // #15 Click "Export" button
      // * Success toast notification is shown:
      //  * "Authority headings updates report (Job ID <<export manager job id>>) is being generated. Go to the Export manager app to download report. It may take a few minutes for the report to complete."
      // * Modal is closed
      // #16 Go to "Export manager" app → Check "Authority control" checkbox in "Job type" accordion
      // * Main page of "Export manager" app is opened
      // * In second pane ("Export jobs"), first row has "Job ID" which was mentioned in success toast notification in Step 15
      // #17 Click on "Job ID" which was mentioned in success toast notification on Step 16
      // * CSV file is downloaded to the local machine
      // * Downloaded file has following name structure:
      //  * <<current date-time>>_auth-headings-updates.csv
      //    (Date-time should be in following format: yyyy-MM-dd_HH-mm-s_SSSS)
      // #18 Open downloaded CSV file
      // * CSV file includes a line with data for first update of controlling record with following values:
      //  * "Last updated" (current date and time of heading update in following format: YYYY-MM-DD <<time>>)
      //  * "Original heading" (for example,  "Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major")
      //  * "New heading" (for example, "Beethoven, Ludwig the Greatest, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major")
      //  * "Identifier" (value from "010" field, for example, "n83130832 ")
      //  * "Original 1XX" (for example, "100")
      //  * "New 1XX" (for example, "100")
      //  * "Authority source file name" (for example, "LC Name Authority file (LCNAF)")
      //  * "Number of bibliographic records linked" (for example, "1")
      //  * "Updater" (current user first and last name)
      // * CSV file includes a line with data for second update of controlling record with following values:
      //  * "Last updated" (current date and time of heading update in following format: YYYY-MM-DD <<time>>)
      //  * "Original heading" (for example,  "Beethoven, Ludwig the Greatest, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major")
      //  * "New heading" (for example, "Beethoven, Ludwig the Loudest, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major")
      //  * "Identifier" (value from "010" field, for example, "n83130832 ")
      //  * "Original 1XX" (for example, "100")
      //  * "New 1XX" (for example, "100")
      //  * "Authority source file name" (for example, "LC Name Authority file (LCNAF)")
      //  * "Number of bibliographic records linked" (for example, "1")
      //  * "Updater" (current user first and last name)
      // * CSV file does includes a line with data for update of NOT controlling record (for example, with "New heading" = "Delaware TEST Delaware symposia on language studies 1985")
    },
  );
});
