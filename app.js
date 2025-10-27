// app.js - handles data in localStorage and operations
(function(){
  // expose some helper functions to window
  window.ensureSeed = ensureSeed;
  window.getAllUsers = getAllUsers;
  window.getUserByUsername = getUserByUsername;
  window.loginUser = loginUser;
  window.getCurrentUser = getCurrentUser;
  window.logout = logout;
  window.transferFunds = transferFunds;
  window.getTransactionsForUser = getTransactionsForUser;
  window.adminAddUser = adminAddUser;
  window.adminSetBalance = adminSetBalance;
  window.adminDeleteUser = adminDeleteUser;
})();

function ensureSeed(){
  if(!localStorage.getItem('mb_users')){
    const users = [
      { username:'alice', name:'Alice Khan', password:'alice123', balance:500.00 },
      { username:'bob', name:'Bob Ahmed', password:'bob123', balance:300.00 }
    ];
    localStorage.setItem('mb_users', JSON.stringify(users));
    localStorage.setItem('mb_tx', JSON.stringify([]));
  }
}

function getAllUsers(){
  return JSON.parse(localStorage.getItem('mb_users')||'[]');
}
function saveUsers(users){ localStorage.setItem('mb_users', JSON.stringify(users)); }

function getUserByUsername(username){
  return getAllUsers().find(u=>u.username===username);
}

function loginUser(username, password){
  if(!username || !password) return {success:false, message:'Enter username and password'};
  const u = getUserByUsername(username);
  if(!u) return {success:false, message:'User not found'};
  if(u.password !== password) return {success:false, message:'Incorrect password'};
  localStorage.setItem('mb_current', JSON.stringify({username:u.username, name:u.name}));
  return {success:true, message:'Logged in'};
}
function getCurrentUser(){
  return JSON.parse(localStorage.getItem('mb_current')||'null');
}
function logout(){ localStorage.removeItem('mb_current'); }

function getTransactions(){
  return JSON.parse(localStorage.getItem('mb_tx')||'[]');
}
function saveTransactions(tx){ localStorage.setItem('mb_tx', JSON.stringify(tx)); }

function addTransaction(tx){
  const txs = getTransactions();
  txs.unshift(tx); // newest first
  saveTransactions(txs);
}

// return transactions for a username (both debit and credit)
function getTransactionsForUser(username){
  const txs = getTransactions();
  return txs.filter(t=> t.from===username || t.to===username ).map(t=>{
    const type = (t.from===username) ? 'debit' : 'credit';
    return {
      date: t.date,
      type,
      amount: t.amount,
      counterparty: (type==='debit'? t.to : t.from),
      note: t.note || ''
    }
  });
}

function transferFunds(fromUser, toUser, amount, note){
  if(!fromUser) return {success:false, message:'Not logged in'};
  if(!toUser) return {success:false, message:'Enter recipient username'};
  if(isNaN(amount) || amount<=0) return {success:false, message:'Enter valid amount'};
  if(fromUser === toUser) return {success:false, message:'Cannot transfer to yourself'};
  const users = getAllUsers();
  const from = users.find(u=>u.username===fromUser);
  const to = users.find(u=>u.username===toUser);
  if(!to) return {success:false, message:'Recipient not found'};
  if(from.balance < amount) return {success:false, message:'Insufficient balance'};
  // perform transfer
  from.balance = +(from.balance - amount);
  to.balance = +(to.balance + amount);
  saveUsers(users);
  const now = new Date().toLocaleString();
  addTransaction({ from: fromUser, to: toUser, amount: +amount, note: note||'', date: now });
  return {success:true, message:`$${amount.toFixed(2)} sent to ${toUser}`};
}

// Admin functions
function adminAddUser({name,username,password,balance}){
  const users = getAllUsers();
  if(users.some(u=>u.username===username)) return {success:false, message:'Username exists'};
  users.push({username, name, password, balance: +balance});
  saveUsers(users);
  // create initial credit tx if balance > 0 (from 'bank')
  if(balance>0){
    addTransaction({ from:'bank', to:username, amount:+balance, note:'Initial balance', date: new Date().toLocaleString() });
  }
  return {success:true, message:'User added'};
}
function adminSetBalance(username, newBalance){
  const users = getAllUsers();
  const u = users.find(x=>x.username===username);
  if(!u) return false;
  const old = u.balance;
  u.balance = +newBalance;
  saveUsers(users);
  // record adjustment tx for admin action
  if(newBalance > old){
    addTransaction({ from:'bank', to:username, amount: +(newBalance-old), note:'Admin top-up', date:new Date().toLocaleString() });
  } else if(newBalance < old){
    addTransaction({ from:username, to:'bank', amount: +(old-newBalance), note:'Admin deduction', date:new Date().toLocaleString() });
  }
  return true;
}
function adminDeleteUser(username){
  let users = getAllUsers();
  users = users.filter(u=>u.username!==username);
  saveUsers(users);
  // optional: remove their transactions (we keep txs here for history)
  return true;
}
