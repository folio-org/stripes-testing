import holdingsRecordView from './holdingsRecordView';
import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {

  addMarcHoldingRecord:() => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    const quickmarcEditor = new QuickMarcEditor(InventoryInstance.validOCLC);
    quickmarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    QuickMarcEditor.addPermanentLocation();
    QuickMarcEditor.pressSaveAndClose();
    holdingsRecordView.waitLoading();
  },
};
