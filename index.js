"use strict";


//-------- var declaration --------

//canvas
const canvas = document.getElementById('canva');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;

//level
let level = 0;
let level_interval = 500;

//score
const scorebar = document.getElementById('score');
const levelbar = document.getElementById('level_show')
let score = 0;
let score_add = 50;
let score_bonus = 10;
let highScore;
let highLevel;

//player
const player_x = canvas.width/2;
const player_y = canvas.height/2;
const player_radius = 15;

//enemy
let enemy_min_r = 20;
let enemy_max_r = 40;
let enemy_speed = 1;
let enemy_acc_rate = 0.5;
let enemy_die = 25;

//projectile
const proj_radius = 5;
const proj_speed = 7;

//shoot
let shoot;
let shoot_begin = 5;
let shoot_per_second;
let shoot_acc = 0.5;

//particle
const friction = 0.98;
let par_speed_init = 10;
let par_speed;

//game excute
let projectiles = [];
let enemies = [];
let particles = [];
let animateID;
let spawn;



//-------- class section --------

class Obj {
  constructor (x, y, r, c){
    this.x=x;
    this.y=y;
    this.radius=r;
    this.color=c;
  }
  draw(){
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Player extends Obj {
  constructor(x, y, r, c){
    super(x, y, r, c)
    this.angle = 0.3*Math.PI;
  }
  draw(){
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.arc(this.x+Math.cos(this.angle)*this.radius, this.y+Math.sin(this.angle)*this.radius, 8, 0, Math.PI*2, true);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class moveObj extends Obj{
  constructor(x, y, r, c, v){
    super(x, y, r, c);
    this.velocity=v;
  }
  draw(){
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
  update(){
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.draw();
  }
}

class particle extends moveObj{
  constructor(x, y, r, c, v){
    super(x, y, r, c, v)
    this.alpha = 1;
  }
  draw(){
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
  update(){
    this.velocity.x *= friction;
    this.velocity.y *= friction;
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha -= 0.01;
    this.draw();
  }
}

//-------- basic function --------

function randInt(start, end){
  return Math.floor(Math.random()*(end-start+1)+start);
}

function setcookie(name, value, daysTolive) {
  let cookie = name + "=" + encodeURIComponent(value);
  if (typeof daysTolive === "number")
    cookie += "; max-age =" + (daysTolive * 60 * 60 * 24);
  document.cookie = cookie;
}

function getCookieByName(name) {
  let arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
  if (arr != null) return unescape(arr[2]); 
  return null;
  // var value = parseCookie()[name];
  // if (value) {
  //     value = decodeURIComponent(value);
  // }
  // return value;
}

//-------- excutive function --------

function startGame(){
  showHigh();
  Swal.fire({
    icon: 'success',
    width: '360px',
    padding: '30px',
    html: 
      '<h1>YOU GET</h1>'+
      '<h2 style="margin:0; padding:0 0 20px 0;">'+String(score)+' / LV'+String(level)+"</h2>"+
      '<p style="margin:0;">Highest: '+String(highScore)+'/ LV'+String(highLevel)+'</p>',
    confirmButtonText: 'Start',
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    },
    allowOutsideClick:false
  }).then(()=>{
    resetGame();
    animate();
  });
}

function animate(){
  animateID = requestAnimationFrame(animate);

  // draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // draw the player
  player.draw();

  // update particles (explosion animation)
  particles.forEach((particle, index)=>{
    if (particle.alpha<=0.01){
      setTimeout(()=>{
        particles.splice(index, 1);
        }, 0)
    } else {
      particle.update()  
    }
  })

  // update projectiles
  projectiles.forEach((projectile, p_index)=>{
    projectile.update();

    //detect projectile out of screen
    if (projectile.x+projectile.radius<0 ||
      projectile.x-projectile.radius>canvas.width ||
      projectile.y+projectile.radius<0 ||
      projectile.y-projectile.radius>canvas.height){
      setTimeout(()=>{
        projectiles.splice(p_index, 1);
      }, 0)
    }
  });
  
  // update enemies (collision detection)
  enemies.forEach((enemy, e_index)=>{
    enemy.update();

    // end game detection
    if (collision(enemy, player)) {
      endGame();
    }

    // hit enemy detection
    projectiles.forEach((projectile, p_index)=>{
      if (collision(enemy, projectile)){
        updateScore(score_add);

        //generate particles
        for (let i = 0; i<enemy.radius*1.5; i++){ 
          particles.push(new particle(projectile.x, projectile.y, Math.random()*3, enemy.color, {x:(Math.random()-0.5)*par_speed, y:(Math.random()-0.5)*par_speed}))
        }
        // shrivel the enemy 
        gsap.to(enemy, 0.05, {
          radius: enemy.radius - 10
        })
        // eliminate enemy too small
        if (enemy.radius>enemy_die){
          setTimeout(()=>{
            projectiles.splice(p_index, 1);
          }, 0)
        } else{
          updateScore(score_bonus);
          setTimeout(()=>{
            enemies.splice(e_index, 1);
            projectiles.splice(p_index, 1);
          }, 0)
        }
      }
    })

    //level up
    if (score >= level*level_interval){
      levelUp();
    }
  });
}

function endGame(){
  if (score>highScore){
    setcookie('high_score', String(score), 30);
    setcookie('high_level', String(level), 30);
    // document.cookie = 'high_score='+String(score);
    // document.cookie = 'high_level='+String(level);
  }
  showHigh();
  clearInterval(spawn);
  clearInterval(shoot);
  cancelAnimationFrame(animateID);
  startGame();
}

function resetGame(){
  shoot_per_second = shoot_begin;
  par_speed = par_speed_init;
  score = 0;
  scorebar.innerHTML = String(score);
  particles = [];
  enemies = [];
  level = 0;
  levelbar.innerHTML = String(level);
  projectiles = [];
  enemy_speed = 1;
  shoot_per_second = 5;
  startShoots(shoot_per_second)
  spawnEnemies();
}

//spawn enemy in a fixed rate
function spawnEnemies(){
  spawn = setInterval(function(){
    const r = randInt(enemy_min_r, enemy_max_r);
    console.log(r);
    // const r = randInt(20, 40);
    let x;
    let y;

    //determine where to spawn
    if (Math.random()<0.5){
      x = Math.random() < 0.5 ? 0-r : canvas.width+r; 
      y = randInt(0-r, canvas.height+r);
    }
    else {
      x = randInt(0-r, canvas.width+r);
      y = Math.random() < 0.5 ? 0-r : canvas.height+r;
    }
    const angle = Math.atan2(player_y-y, player_x-x);
    const v = {
      x:Math.cos(angle)*enemy_speed,
      y:Math.sin(angle)*enemy_speed
    }
    enemies.push(new moveObj(x, y, r, `hsl(${randInt(0, 360)}, 50%, 50%)`, v));
  }, 1000);
}

function startShoots(shoot_per_second){
  shoot = setInterval(function(){
    const proj_velocity = {
      x:Math.cos(player.angle)*proj_speed,
      y:Math.sin(player.angle)*proj_speed
    } 
    projectiles.push(new moveObj(player_x, player_y, proj_radius, 'white', proj_velocity));
  }, 1000/shoot_per_second);
}

function levelUp(){
  level += 1;
  enemy_speed += enemy_acc_rate;
  par_speed += 0.5;
  shoot_per_second += shoot_acc;
  clearInterval(shoot);
  startShoots(shoot_per_second);
  document.getElementById('levelText').innerHTML = 'LEVEL'+ String(level);
  document.getElementById('levelText').style.color = `hsl(${randInt(0, 360)}, 50%, 50%)`;
  levelbar.innerHTML = String(level);
  $('#level').fadeIn().animate(
    {opacity: 1}, 800, 'swing'
  );
  $('#level').fadeIn().animate(
    {opacity: 0}, 800, 'swing'
  );
}

function showHigh(){
  highScore = parseInt(getCookieByName('high_score'))
  highLevel = parseInt(getCookieByName('high_level'))
  document.getElementById('high_score').innerHTML = highScore;
  document.getElementById('high_level').innerHTML = highLevel;
}

function collision(obj1, obj2){
  const dist = Math.hypot(obj1.x-obj2.x, obj1.y-obj2.y);
  if(dist - obj1.radius - obj2.radius<1){
    return true;
  } else {
    return false;
  }
}

function updateScore(add){
  score += add;
  scorebar.innerHTML = score;
}

//reset High button
function resetHigh(){
  setcookie('high_score', '0', 30);
  setcookie('high_level', '0', 30);
  // document.cookie = 'high_score=0';
  // document.cookie = 'high_level=0';
  showHigh();
}


//-------- main section --------

const player = new Player(player_x, player_y, player_radius, 'white');

if (!document.cookie){
  setcookie('high_score', '0', 30);
  setcookie('high_score', '0', 30);
}

window.addEventListener('mousemove', function(e){
  e = e || window.event;
  const angle = Math.atan2(e.clientY-player_y, e.clientX-player_x);
  player.angle = angle;
});

startGame();
