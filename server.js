const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const app = express();
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const KEY = process.env.CONTROLLER_KEY;

if (!TOKEN || !KEY) {
  console.error("Set DISCORD_TOKEN and CONTROLLER_KEY in the hosting environment.");
  process.exit(1);
}

const client = new Client({intents:[GatewayIntentBits.Guilds]});

client.once("ready", () => console.log("Bot online: " + client.user.tag));

function auth(req,res,next) {
  if (req.get("x-controller-key") !== KEY)
    return res.status(401).json({success:false,message:"Controller key salah."});
  next();
}

app.get("/api/status", auth, (req,res) => {
  res.json({success:true,online:client.isReady(),bot:client.user?.tag || null});
});

app.post("/api/send-embed", auth, async (req,res) => {
  try {
    const d=req.body||{};
    if(!d.channelId) return res.status(400).json({success:false,message:"Channel ID wajib diisi."});
    if(!d.title && !d.description) return res.status(400).json({success:false,message:"Title atau description wajib diisi."});

    const channel=await client.channels.fetch(d.channelId);
    if(!channel || !channel.isTextBased())
      return res.status(400).json({success:false,message:"Channel tidak ditemukan atau bukan text channel."});

    const embed=new EmbedBuilder();
    if(d.title) embed.setTitle(String(d.title).slice(0,256));
    if(d.description) embed.setDescription(String(d.description).slice(0,4096));
    if(/^#[0-9a-fA-F]{6}$/.test(d.color||"")) embed.setColor(d.color);
    if(d.url) try { embed.setURL(new URL(d.url).toString()); } catch {}
    if(d.thumbnail) try { embed.setThumbnail(new URL(d.thumbnail).toString()); } catch {}
    if(d.image) try { embed.setImage(new URL(d.image).toString()); } catch {}
    if(d.footer) embed.setFooter({text:String(d.footer).slice(0,2048)});
    if(d.timestamp) embed.setTimestamp();

    const message=await channel.send({
      content:d.content ? String(d.content).slice(0,2000) : undefined,
      embeds:[embed]
    });

    res.json({success:true,messageId:message.id});
  } catch(e) {
    console.error(e);
    res.status(500).json({success:false,message:e.message || "Gagal mengirim embed."});
  }
});

app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log("Controller running on port "+PORT));
client.login(TOKEN).catch(e=>{console.error(e);process.exit(1);});