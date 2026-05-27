import * as adminRepository from "../repositories/adminRepository.js";

export async function listFieldOptions(req, res, next) {
  try {
    const options = await adminRepository.listFieldOptions(req.params.optionKey);
    res.json({ data: options });
  } catch (error) {
    next(error);
  }
}

export async function listRows(req, res, next) {
  try {
    const rows = await adminRepository.listModuleRows(req.params.moduleName);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createRow(req, res, next) {
  try {
    const row = await adminRepository.createModuleRow(req.params.moduleName, req.body);
    res.status(201).json({ data: row });
  } catch (error) {
    next(error);
  }
}

export async function updateRow(req, res, next) {
  try {
    const row = await adminRepository.updateModuleRow(
      req.params.moduleName,
      Number(req.params.id),
      req.body
    );
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
}

export async function deleteRow(req, res, next) {
  try {
    await adminRepository.deleteModuleRow(req.params.moduleName, Number(req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
