import * as accountRepository from "../repositories/accountRepository.js";

export async function getAccount(req, res, next) {
  try {
    const account = await accountRepository.findByUserId(Number(req.params.userId));
    res.json({ data: account });
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(req, res, next) {
  try {
    const account = await accountRepository.updateAccount(Number(req.params.userId), req.body);
    res.json({ data: account });
  } catch (error) {
    next(error);
  }
}

export async function listPeople(req, res, next) {
  try {
    const people = await accountRepository.findPeopleForBinding(req.query);
    res.json({ data: people });
  } catch (error) {
    next(error);
  }
}

export async function bindPeople(req, res, next) {
  try {
    const account = await accountRepository.bindPeople(Number(req.params.userId), Number(req.body.peopleId));
    res.json({ data: account });
  } catch (error) {
    next(error);
  }
}

export async function unbindPeople(req, res, next) {
  try {
    const account = await accountRepository.unbindPeople(Number(req.params.userId));
    res.json({ data: account });
  } catch (error) {
    next(error);
  }
}
