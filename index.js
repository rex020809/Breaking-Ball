"use strict";


//-------- var declaration --------

//canvas
const canvas = document.getElementById('canva');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;

//score
const scorebar = document.getElementById('score');
let score = 0;

//player
const player_x = canvas.width/2;
const player_y = canvas.height/2;
const player_radius = 15;

//enemy
let enemy_speed = 1;

//projectile
const proj_radius = 5;
const proj_speed = 4;

//particle
const friction = 0.98;
const par_speed = 10;

//game excute
let started = false;
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

//-------- function section --------


function randInt(start, end){
  return Math.floor(Math.random()*(end-start+1)+start);
}

function startGame(){
  Swal.fire({
    icon: 'success',
    title: 'YOU GET',
    width: '300px',
    padding: '30px',
    html: 
      '<h1 style="margin:0;">'+String(score)+"</h1>",
    confirmButtonText: 'Start',
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    },
    allowOutsideClick:false
  }).then(()=>{
    score = 0;
    scorebar.innerHTML = String(score);
    particles = [];
    enemies = [];
    projectiles = [];
    spawn = spawnEnemies();
    animate();
  });
}

//spawn enemy in a fixed rate
function spawnEnemies(){
  return setInterval(function(){
    const r = randInt(20, 35);
    let x;
    let y;
    if (Math.random()<0.5){
      x = Math.random() < 0.5 ? 0-r : canvas.width+r; 
      y = randInt(0-r, canvas.height+r);
    }
    else {
      x = randInt(0-r, canvas.width+r);
      y = Math.random() < 0.5 ? 0-r : canvas.height+r;
    }    
    const c_index = randInt(0, 360)
    const c = `hsl(${c_index}, 50%, 50%)`;
    const angle = Math.atan2(player_y-y, player_x-x);
    const v = {
      x:Math.cos(angle)*enemy_speed,
      y:Math.sin(angle)*enemy_speed
    }
    enemies.push(new moveObj(x, y, r, c, v));
  }, 1000);
}

function animate(){
  animateID = requestAnimationFrame(animate);

  // draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // draw the player ball
  player.draw();

  // explosion animation
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

  
  //collision detection and update enemies
  enemies.forEach((enemy, e_index)=>{
    enemy.update();

    //end game detection
    const dist = Math.hypot(player.x-enemy.x, player.y-enemy.y);
    if (dist - enemy.radius - player.radius<1) {
      clearInterval(spawn);
      started = false;
      cancelAnimationFrame(animateID);
      startGame();
    }

    //projectile-enemy detection
    projectiles.forEach((projectile, p_index)=>{
      const dist = Math.hypot(projectile.x-enemy.x, projectile.y-enemy.y);
      if (dist - projectile.radius - enemy.radius < 1){
        score += 100;
        scorebar.innerHTML = score;
        for (let i = 0; i<enemy.radius*1.5; i++){
          particles.push(new particle(projectile.x, projectile.y, Math.random()*3, enemy.color, {x:(Math.random()-0.5)*par_speed, y:(Math.random()-0.5)*par_speed}))
        }
        if (enemy.radius>20){
          gsap.to(enemy, 0.1, {
            radius: enemy.radius - 10
          })
          setTimeout(()=>{
            projectiles.splice(p_index, 1);
            }, 0)
        } else{
          score += 100;
          scorebar.innerHTML = score;
          setTimeout(()=>{
            enemies.splice(e_index, 1);
            projectiles.splice(p_index, 1);
            }, 0)
        }
      }
    })
  });
}

//-------- main section --------

//generate projectile


const player = new Obj(player_x, player_y, player_radius, 'white');
player.draw()
startGame();


window.addEventListener('click', function(e){
  e = e || window.event;
  const angle = Math.atan2(e.clientY-player_y, e.clientX-player_x);
  const proj_velocity = {
    x:Math.cos(angle)*proj_speed,
    y:Math.sin(angle)*proj_speed
  }
  projectiles.push(new moveObj(player_x, player_y, proj_radius, 'white', proj_velocity));
  
  //防止按下start的時候射出一顆子彈
  if (!started && score == 0) {
    projectiles = [];
    started = true;
  }
});


