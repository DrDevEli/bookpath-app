import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({                                                                                                  
    username: {                                                                                                                             
      type: String,                                                                                                                         
      required: true,                                                                                                                       
      unique: true,                                                                                                                         
      trim: true                                                                                                                            
    },                                                                                                                                      
    email: {                                                                                                                                
      type: String,                                                                                                                         
      required: true,                                                                                                                       
      unique: true,                                                                                                                         
      trim: true,                                                                                                                           
      lowercase: true                                                                                                                       
    },                                                                                                                                      
    password: {                                                                                                                             
      type: String,                                                                                                                         
      required: true                                                                                                                        
    },                                                                                                                                      
    createdAt: {                                                                                                                            
      type: Date,                                                                                                                           
      default: Date.now                                                                                                                     
    },
    gpgPublicKey: {
      type: String,
      trim: true
    },
    gpgKeyId: {
      type: String,
      trim: true
    }
  });                                                                                                                                       
                                                                                                                                            
  // Hash password before saving                                                                                                            
  userSchema.pre('save', async function(next) {                                                                                             
    if (this.isModified('password')) {                                                                                                      
      this.password = await bcrypt.hash(this.password, 23);                                                                                 
    }                                                                                                                                       
    next();                                                                                                                                 
  });                                                                                                                                       
                                                                                                                                            
  // Compare password method                                                                                                                
  userSchema.methods.comparePassword = async function(candidatePassword) {                                                                  
    return await bcrypt.compare(candidatePassword, this.password);                                                                          
  };                                                                                                                                        
                                                                                                                                            
  const User = mongoose.model('User', userSchema);                                                                                          
                                                                                                                                            
  export default User;
