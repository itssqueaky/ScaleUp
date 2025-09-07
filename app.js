(function(){
const els={howBtn:document.getElementById('howBtn'),modal:document.getElementById('modal'),backdrop:document.getElementById('backdrop'),closeModal:document.getElementById('closeModal'),howText:document.getElementById('howText')};
const HOW_TEXT=`1. Compete in the mini-game
Play the snake game and try to achieve your higest score.

2. Earn as high of a score as you can
Your best score will be saved and displayed on the leaderboard.

3. Score top 3 to win
Rank in the top 3 of the leaderboard to receive 100% of generated creator fees every 30 minutes.

Prize Distribution
1st Place 60%
2nd Place 30%
3rd Place 10%

good luck and have fun!`;
els.howText.textContent=HOW_TEXT;
els.howBtn.addEventListener('click',()=>{els.modal.style.display='flex';els.backdrop.style.display='block';});
function close(){els.modal.style.display='none';els.backdrop.style.display='none';}
els.closeModal.addEventListener('click',close);els.backdrop.addEventListener('click',close);
})();